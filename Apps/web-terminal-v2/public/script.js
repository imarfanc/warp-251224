let ws;
let term;
let currentPath = "~";
let allGroupsExpanded = true;
const groupStates = new Map();

function updatePrompt(path) {
  const home = "/Users/arfan";
  let displayPath = path;
  if (path.startsWith(home)) {
    displayPath = "~" + path.substring(home.length);
  }
  term.set_prompt(`[[b;#00ff9d;]user@local][[;#e2e8f0;]:][[b;#00f0ff;]${displayPath}]$ `);
}

function connect() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    term.echo("[[b;#00ff9d;]Connected to server]");
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "cwd") {
      currentPath = message.data;
      updatePrompt(currentPath);
    } else if (message.type === "status") {
      if (message.data === "running") {
        term.pause();
        if (message.command && message.isBatch) {
          const prompt = term.get_prompt();
          term.echo(`${prompt}${message.command}`, { class: "terminal-command-line" });
        }
      } else if (message.data === "finished") {
        term.resume();
      }
    } else if (message.type === "output") {
      let data = message.data.replace(/\x1b\[\?25[lh]/g, "");

      if (data.includes("\r") || data.includes("\x1b[2K")) {
        const parts = data.split(/\r|\x1b\[2K/);
        const lastPart = parts[parts.length - 1];

        if (lastPart === "" && parts.length > 1) {
          return;
        }

        const terminal = $("#terminal").terminal();
        const lastEcho = terminal.last();

        if (lastEcho && !data.includes("\n")) {
          lastEcho.html($.terminal.ansi_to_formatting(lastPart));
        } else {
          terminal.echo($.terminal.ansi_to_formatting(lastPart));
        }
      } else {
        term.echo(data);
      }
    }
  };

  ws.onclose = () => {
    term.echo("[[b;#ef4444;]Disconnected from server. Retrying...]");
    setTimeout(connect, 2000);
  };
}

function toggleGroup(groupHeader) {
  const groupContent = groupHeader.next(".group-content");
  const isCollapsed = groupContent.hasClass("collapsed");
  const chevron = groupHeader.find(".group-chevron");

  if (isCollapsed) {
    groupContent.removeClass("collapsed");
    groupHeader.removeClass("collapsed");
    groupStates.set(groupHeader.data("group-id"), false);
  } else {
    groupContent.addClass("collapsed");
    groupHeader.addClass("collapsed");
    groupStates.set(groupHeader.data("group-id"), true);
  }

  updateCollapseAllButtonState();
}

function toggleAllGroups() {
  const btn = $("#collapse-all-btn");
  const newExpandedState = !allGroupsExpanded;

  allGroupsExpanded = newExpandedState;

  if (allGroupsExpanded) {
    btn.removeClass("collapsed");
    btn.attr("aria-label", "Collapse all groups");
  } else {
    btn.addClass("collapsed");
    btn.attr("aria-label", "Expand all groups");
  }

  $(".group-header").each(function () {
    const groupContent = $(this).next(".group-content");
    const groupId = $(this).data("group-id");

    if (allGroupsExpanded) {
      groupContent.removeClass("collapsed");
      $(this).removeClass("collapsed");
      groupStates.set(groupId, false);
    } else {
      groupContent.addClass("collapsed");
      $(this).addClass("collapsed");
      groupStates.set(groupId, true);
    }
  });
}

function updateCollapseAllButtonState() {
  const btn = $("#collapse-all-btn");
  const groups = $(".group-header");
  let collapsedCount = 0;

  groups.each(function () {
    if ($(this).hasClass("collapsed")) {
      collapsedCount++;
    }
  });

  if (collapsedCount === groups.length) {
    allGroupsExpanded = false;
    btn.addClass("collapsed");
    btn.attr("aria-label", "Expand all groups");
  } else if (collapsedCount === 0) {
    allGroupsExpanded = true;
    btn.removeClass("collapsed");
    btn.attr("aria-label", "Collapse all groups");
  }
}

$(function () {
  // Load commands from API
  fetch("/api/commands")
    .then((response) => response.json())
    .then((groups) => {
      const list = $("#command-list");

      groups.forEach((groupObj, index) => {
        if (groupObj.commands && groupObj.commands.length > 0) {
          const groupId = `group-${index}`;
          const delay = index * 0.1;

          // Create group container
          const groupContainer = $("<div>").addClass("group-container").css("animation-delay", `${delay}s`);

          // Add group header
          const header = $("<button>")
            .addClass("group-header")
            .attr("data-group-id", groupId)
            .attr("aria-expanded", "true")
            .attr("aria-controls", `${groupId}-content`)
            .html(`
                                <span class="group-header-text">${groupObj.group}</span>
                                <svg class="group-chevron" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                                </svg>
                            `)
            .click(function () {
              toggleGroup($(this));
            })
            .on("keydown", function (e) {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleGroup($(this));
              }
            });

          groupContainer.append(header);

          // Create content container
          const content = $("<div>").addClass("group-content").attr("id", `${groupId}-content`);

          groupObj.commands.forEach((cmd) => {
            const btn = $("<button>")
              .addClass("command-btn")
              .text(cmd.label)
              .click(function () {
                run(cmd.command);
              })
              .on("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  run(cmd.command);
                }
              });
            content.append(btn);
          });

          groupContainer.append(content);
          list.append(groupContainer);

          // Initialize state
          groupStates.set(groupId, false);
        }
      });
    })
    .catch((err) => console.error("Error loading commands:", err));

  // Collapse all button functionality
  $("#collapse-all-btn").on("click", function (e) {
    e.preventDefault();
    toggleAllGroups();
  });

  // Keyboard support for collapse all button
  $("#collapse-all-btn").on("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleAllGroups();
    }
  });

  // Initialize terminal
  term = $("#terminal").terminal(
    function (command) {
      if (command !== "") {
        ws.send(command);
      }
    },
    {
      greetings:
        "╔══════════════════════════════════════════╗\n║  Web Terminal V2 - Cyberpunk Edition      ║\n║  Type commands or use the sidebar shortcuts║\n╚══════════════════════════════════════════╝",
      name: "web_terminal",
      prompt: "[[b;#00ff9d;]user@local][[;#e2e8f0;]:][[b;#00f0ff;]~]$ ",
    },
  );

  connect();
});

function run(cmd) {
  const commands = Array.isArray(cmd) ? cmd : [cmd];
  ws.send(JSON.stringify(commands));
}
