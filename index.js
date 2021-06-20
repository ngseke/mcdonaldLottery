const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { Table } = require('console-table-printer');
const chalk = require('chalk');

const user = require('./models/user');
const lottery = require('./models/lottery');

const { log } = console;

const getType = (object) => {
  const keys = Object.keys(object);
  if (keys.includes('sticker')) return 'sticker';
  if (keys.includes('coupon')) {
    if (/已領過/g.test(object?.coupon?.object_info?.title)) return 'drawn';
    return 'coupon';
  }
  return 'failed';
};

/** 解析帳號密碼參數 */
const getUsersFromArgv = () => {
  const { user: userStrings } = yargs(hideBin(process.argv))
    .array('user').argv;

  if (!userStrings) throw new Error('缺少參數 `--user`!');

  return userStrings.map((string) => {
    try {
      const [account, password] = string.split(',');
      if (!(account && password)) throw new Error();
      return { account, password };
    } catch (e) {
      throw new Error('`--user` 的各組參數應以逗號分隔帳號和密碼！');
    }
  });
};

const draw = async () => {
  const users = getUsersFromArgv();

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
    const accessToken = (await user.getToken(account, password))
      .body.results.member_info.access_token;

    log(chalk.cyan('  🃏 抽卡中...'));
    const results = (await lottery.getLottery(accessToken))
      ?.body?.results;

    const defaultData = { account };

    try {
      const type = getType(results);
      if (!results || type === 'failed') throw new Error('');

      const couponTitle = results?.coupon?.object_info?.title;

      const { result, color } = {
        sticker: { color: 'yellow', result: '🟡 歡樂貼' },
        coupon: { color: 'green', result: `🟢 ${couponTitle}` },
        drawn: { color: 'blue', result: `🔵 ${couponTitle}` },
      }[type];

      table.addRow({ ...defaultData, result }, { color });
    } catch (e) {
      table.addRow(
        { ...defaultData, result: '🔺 獲取失敗，請再試一次' },
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
