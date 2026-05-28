/**
 * @qadr/cli - Config Command
 */

import type { Command } from 'commander';

export function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .description('Manage QADR configuration')
    .option('--list', 'List all configuration values')
    .option('--init', 'Initialize a configuration file')
    .action(async () => {
      console.log('Config management not yet implemented.');
    });
}
