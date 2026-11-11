const { spawn } = require('child_process');

const child = spawn('node', ['node_modules/expo/bin/cli', 'config', '--json'], {
  cwd: 'C:\\Users\\gam3r\\OneDrive\\Documents\\PROYECTOS\\beat-vortesx',
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
  console.log('STDOUT:', data.toString());
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
  console.log('STDERR:', data.toString());
});

child.on('close', (code) => {
  console.log('Exit code:', code);
  console.log('Full stdout:', stdout);
  console.log('Full stderr:', stderr);
});