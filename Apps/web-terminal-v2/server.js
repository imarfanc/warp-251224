const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to serve commands from all YAML files in the commands directory
app.get('/api/commands', (req, res) => {
    try {
        const commandsDir = path.join(__dirname, 'public', 'commands');
        const files = fs.readdirSync(commandsDir);
        const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
        
        const groupedCommands = yamlFiles.map(file => {
            const filePath = path.join(commandsDir, file);
            const yamlData = fs.readFileSync(filePath, 'utf8');
            const parsed = yaml.load(yamlData);
            return {
                group: path.parse(file).name,
                commands: parsed.commands || []
            };
        });
        
        res.json(groupedCommands);
    } catch (err) {
        console.error('Error reading commands directory:', err);
        res.status(500).json({ error: 'Failed to load commands' });
    }
});

wss.on('connection', (ws) => {
    console.log('Client connected');
    let currentCwd = process.cwd();

    ws.on('message', async (message) => {
        let msgData;
        try {
            // Try to parse as JSON for array of commands
            msgData = JSON.parse(message.toString());
        } catch (e) {
            // Fallback to string if not JSON
            msgData = message.toString().trim();
        }

        const commands = Array.isArray(msgData) ? msgData : [msgData];
        const isBatch = Array.isArray(msgData);

        for (const command of commands) {
            await new Promise((resolve) => {
                if (!command || typeof command !== 'string') {
                    resolve();
                    return;
                }

                console.log(`Executing: ${command}`);

                // Send running status for all commands including 'cd'
                ws.send(JSON.stringify({ type: 'status', data: 'running', command, isBatch }));

                // Handle 'cd' commands specifically to persist directory state
                if (command.startsWith('cd ')) {
                    const newPath = command.substring(3).trim();
                    const resolvedPath = path.resolve(currentCwd, newPath);
                    
                    if (fs.existsSync(resolvedPath) && fs.lstatSync(resolvedPath).isDirectory()) {
                        currentCwd = resolvedPath;
                        ws.send(JSON.stringify({ 
                            type: 'cwd', 
                            data: currentCwd 
                        }));
                    } else {
                        ws.send(JSON.stringify({ 
                            type: 'output', 
                            data: `Error: Directory not found: ${newPath}\n` 
                        }));
                    }
                    if (!isBatch) {
                        ws.send(JSON.stringify({ type: 'status', data: 'finished', command, isBatch }));
                    }
                    resolve();
                    return;
                }

                const child = spawn(command, [], { 
                    cwd: currentCwd,
                    shell: true,
                    env: { ...process.env, FORCE_COLOR: '1' }
                });

                child.stdout.on('data', (data) => {
                    ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
                });

                child.stderr.on('data', (data) => {
                    ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
                });

                child.on('error', (error) => {
                    ws.send(JSON.stringify({ type: 'output', data: `\nError: ${error.message}\n` }));
                });

                child.on('close', (code) => {
                    if (!isBatch) {
                        ws.send(JSON.stringify({ type: 'status', data: 'finished', code, command, isBatch }));
                    }
                    resolve();
                });
            });
        }

        if (isBatch) {
            ws.send(JSON.stringify({ type: 'status', data: 'finished', isBatch }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
