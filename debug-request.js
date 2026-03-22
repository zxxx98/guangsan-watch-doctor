const crypto = require('crypto');

const APP_ID = "5C7A82A336CB969A121BC3CE74B02CF8";
const APP_SECRET = "8F531809185EFF5CB090F58B6ECA69EE";
const API_BASE_URL = "https://xcx.gy3y.cn/lw/OutPatient";

const config = {
  deptId: "0001102103101",
  departmentName: "产科专家门诊(黄浦)",
  branchId: "02",
  doctorId: "",
  openid: "o6irP5QtKpGjoIC2svm3ca0P0dBA",
  beginDate: "2026-03-27",
  endDate: "2026-03-27"
};

function generateRequestHeaders(requestData = {}, openid = "") {
  const ticks = String(Date.now());
  const nonce = String(Math.floor(Math.random() * 99999999) + 1);

  let c = Object.assign({}, requestData);
  for (let key in c) {
    if (typeof c[key] === 'string') {
      c[key] = c[key].trim();
    }
  }

  let keys = Object.keys(c).sort((e, r) => e.charCodeAt(0) - r.charCodeAt(0));

  let g = "";
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let val = c[key];
    if (val == null || Array.isArray(val) || typeof val === 'object') {
      g += key;
    } else {
      g += key + String(val);
    }
  }

  let rawStr = APP_ID + APP_SECRET + ticks + nonce + g;

  let charArray = rawStr.split("");
  charArray.sort((e, r) => e.charCodeAt(0) - r.charCodeAt(0));

  let sortedStr = charArray.join("").replace(/\s*/g, "");

  let sign = crypto.createHash('md5').update(sortedStr, 'utf8').digest('hex').toUpperCase();

  return {
    "AppId": APP_ID,
    "Sign": sign,
    "xweb_xhr": "1",
    "Ticks": ticks,
    "Nonce": nonce,
    "openid": openid,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541721) XWEB/19027",
    "Accept": "text/json",
    "Content-Type": "application/json;charset=UTF-8",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Referer": "https://servicewechat.com/wx4d35223b6ad22fb1/185/page-frame.html",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "zh-CN,zh;q=0.9"
  };
}

async function testRequest() {
  const params = {
    deptId: config.deptId,
    doctorId: config.doctorId,
    departmentName: config.departmentName,
    beginDate: config.beginDate,
    endDate: config.endDate,
    isToday: '',
    branchId: config.branchId
  };
  const queryParams = new URLSearchParams(params);

  const url = `${API_BASE_URL}/getSchedulingList2_0?${queryParams.toString()}`;
  const headers = generateRequestHeaders(params, config.openid);

  console.log('=== 请求调试信息 ===');
  console.log('请求URL:', url);
  console.log('签名:', headers.Sign);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    console.log('响应状态:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('响应内容:', responseText);

    if (response.ok) {
      try {
        const json = JSON.parse(responseText);
        console.log('\n=== 解析后的JSON ===');
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('无法解析为JSON');
      }
    }
  } catch (error) {
    console.log('请求失败:', error);
  }
}

testRequest();
