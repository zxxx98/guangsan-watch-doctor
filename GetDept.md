GET /lw/OutPatient/GetDept?branchId=02 HTTP/1.1
Host: xcx.gy3y.cn
Connection: keep-alive
AppId: 5C7A82A336CB969A121BC3CE74B02CF8
Sign: 4BCED1ACB8DA1D338BCC17B54318E67E
xweb_xhr: 1
Ticks: 1774339029113
Nonce: 87776615
openid: o6irP5QtKpGjoIC2svm3ca0P0dBA
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf254181d) XWEB/19201
Accept: text/json
Content-Type: application/json;charset=UTF-8
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://servicewechat.com/wx4d35223b6ad22fb1/186/page-frame.html
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9

------------------------------------------------------------

HTTP/1.1 200 OK
Server: none
Date: Tue, 24 Mar 2026 07:57:09 GMT
Content-Type: application/json
Connection: keep-alive
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range
Access-Control-Expose-Headers: Content-Length,Content-Range
Content-Length: 108688
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "branchId": "02",
      "hospitalName": "黄埔院区",
      "departments": [
        {
          "branchId": "02",
          "departmentId": "0001102160",
          "departmentName": "体重管理中心（黄埔）",
          "departmentLevel": "1",
          "departmentParentId": "0",
          "location": "",
          "introduction": "",
          "sort": 0,
          "status": 0,
          "updateTime": "2026-03-24 12:00:01",
          "createTime": "2025-12-09 12:00:01",
          "children": [
            {
              "branchId": "02",
              "departmentId": "0001102160",
              "departmentName": "体重管理中心（黄埔）",
              "departmentLevel": "1",
              "departmentParentId": "0",
              "location": "",
              "introduction": "",
              "sort": 0,
              "status": 0,
              "updateTime": "2026-03-24 12:00:01",
              "createTime": "2025-12-09 12:00:01",
              "children": [
                {
                  "branchId": "02",
                  "departmentId": "0001102160",
                  "departmentName": "体重管理中心（黄埔）",
                  "departmentLevel": "1",
                  "departmentParentId": null,
                  "location": null,
                  "introduction": null,
                  "sort": 0,
                  "status": 0,
                  "updateTime": null,
                  "createTime": null,
                  "children": [],
                  "doctorId": null,
                  "doctorList": []
                }
              ],
              "doctorId": null,
              "doctorList": []
            }
          ],
          "doctorId": null,
          "doctorList": []
        }
      ]
    }
  ]
}