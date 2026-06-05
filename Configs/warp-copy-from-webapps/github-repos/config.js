const CONFIG = {
  cursorCli: '/opt/homebrew/bin/cursor',
  kmMacro: 'run_web_command-26.4',
  homeDir: '/Users/arfan2',
  statusChecks: [
    {
      id: 'gh',
      label: 'Check gh status',
      warpLaunch: 'check_gh_status',
      command:
        'cd $HOME/Developer/gh\nsleep .25\nuv run --with rich $HOME/Developer/gh/web-apps/SCRIPTS/py/gh-status-script/gh_status_table.py',
      kmAriaLabel:
        'Run Keyboard Maestro run_web_command-26.4: gh status table script (Mac)',
    },
    {
      id: 'git',
      label: 'Check git status',
      warpLaunch: 'check_git_status',
      command:
        'cd $HOME/Developer/gh\nsleep .25\nuv run --with rich $HOME/Developer/gh/web-apps/SCRIPTS/py/git-status-script/git_status_table.py',
      kmAriaLabel:
        'Run Keyboard Maestro run_web_command-26.4: git status table script (Mac)',
    },
  ],
};
