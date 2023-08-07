import { run } from 'hardhat';

/**
 * Verifying a smart contract on etherscan
 *
 * @param contractAddress contract address to be verified
 * @param args contract constructor arguments
 */
export const verify = async (contractAddress: string, args: any[]) => {
  console.log('Verifying contract...');
  try {
    await run('verify:verify', {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e: any) {
    if (e.message.toLowerCase().includes('already verified')) {
      console.log('Already verified!');
    } else {
      console.log(e);
    }
  }
};

type LogType = 'text' | 'separator' | 'title';

/**
 * Make logging to console more clear and add some colors and features to improve logging
 *
 * @param text text to be logged into the console
 * @param type the type of the logged text
 */
export const log = (text: string, type: LogType = 'text'): void => {
  if (type === 'separator' || text === 'separator') {
    console.log('-'.repeat(50));
    return;
  }
  if (type === 'title') {
    console.log('\x1b[1m\x1b[48;2;34;34;34m%s\x1b[0m', text);

    return;
  }
  console.log(text);
};
