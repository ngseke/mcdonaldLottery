const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { Table } = require('console-table-printer');
const chalk = require('chalk');

const user = require('./models/user.js');
const lottery = require('./models/lottery');

const { log } = console;

const draw = async () => {
  const { user: userStrings } = yargs(hideBin(process.argv))
    .array('user').argv;

  if (!userStrings) throw new Error('缺少參數 `--user`!');

  // 解析帳號密碼參數
  const users = userStrings.map((string) => {
    try {
      const [account, password] = string.split(',');
      if (!(account && password)) throw new Error();

      return { account, password };
    } catch (e) {
      throw new Error('`--user` 的各組參數應以逗號分隔帳號和密碼！');
    }
  });

  const table = new Table({
    columns: [
      { name: 'account', title: '帳號', alignment: 'left' },
      { name: 'result', title: '結果', alignment: 'left' },
    ],
  });

  for (let index = 0; index < users.length; index += 1) {
    const { account, password } = users[index];
    log(
      chalk(`(${index + 1}/${users.length}) `)
      + chalk.bold.cyan(`${account} `),
    );

    log(chalk.cyan('  🔑 登入中...'));
    // eslint-disable-next-line no-await-in-loop
    const accessToken = (await user.getToken(account, password))
      .body.results.member_info.access_token;

    log(chalk.cyan('  🃏 抽卡中...'));
    // eslint-disable-next-line no-await-in-loop
    const results = (await lottery.getLottery(accessToken))
      ?.body?.results;

    const defaultData = { account };

    if (results) {
      const title = results?.coupon?.object_info?.title;
      const hasWon = Boolean(title);

      table.addRow(
        {
          ...defaultData,
          result: (hasWon) ? `🔵 ${title}` : '🟡 歡樂貼',
        },
        { color: (hasWon) ? 'blue' : 'yellow' },
      );
    } else {
      table.addRow(
        {
          ...defaultData,
          result: '🔺 獲取失敗',
        },
        { color: 'red' },
      );
    }
    log();
  }

  table.printTable();
};

draw();

module.exports = {
  lottery,
  user,
};
