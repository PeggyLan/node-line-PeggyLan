// ngrok http 3000
// npm run dev

// 引用linebot 套件
import linebot from 'linebot'
// 引用 dotenv 套件
import dotenv from 'dotenv'
// fs 為 file system 的簡寫，讀寫檔案用
import fs from 'fs'
import readline from 'readline'

// import bot_sdk from '@line/bot-sdk'

// 引用 request
import rp from 'request-promise'

// 讀取 .env 檔
dotenv.config()

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
})

// -----------------------------------------------

// 在 port 啟動
bot.listen('/', process.env.PORT, () => {
  console.log('機器人已啟動')
})

// -----------------------------------------------

// 檔案讀取資料用
const last_city_list = []
// -----------------------------------------------
// 當收到訊息時
bot.on('message', async (event) => {
  let err_msg = ''

  // --------------------------------
  const msg_input = event.message.text // 此為輸入內容
  console.log(msg_input)
  const msg_input_2_utf = encodeURIComponent(msg_input) // 轉換成UTF8，電腦語言
  let location_lat = '' // 輸入地址的經度
  let location_lng = '' // 輸入地址的緯度
  let place_id = '' // 輸入地址的ID
  let location_status = ''
  let google_map_url = 'https://www.google.com/maps/search/?api=1' // google map 查詢
  let staticmap_url = '' // google map 靜態圖片
  let timezone_msg = '' // 當前時間
  let weather_description = '' // 天氣情況
  let weather_icon_url = '' // 天氣圖標url
  let main_temp = '' // 當前溫度，四捨五入
  let main_feels_like = '' // 體感溫度
  let main_pressure = '' // 氣壓
  let main_humidity = '' // 濕度
  let wind_speed = '' // 風速

  // 參考網址https://developers.line.biz/media/messaging-api/sticker_list.pdf
  let sticker_packageId = 0 // LINE 貼圖參數
  let sticker_stickerId = 0 // LINE 貼圖參數

  let timezone_dstOffset = 0 // google api丟出來的值，表夏令時的偏移量（以秒為單位）
  let timezone_rawOffset = 0 // google api丟出來的值，表給定位置與UTC的偏移量（以秒為單位）

  const dateTime = Date.now() // 當前時間
  // console.log(dateTime)
  const timestamp = Math.floor(dateTime / 1000) // 轉換成時間戳(timestamp)格式，google api規定
  // console.log(timestamp)

  // 利用輸入地址找經緯度，使用google geocode api，必須含有憑證KEY值，address為地址
  // 說明網址https://developers.google.com/maps/documentation/geocoding/start
  const area = 'https://maps.googleapis.com/maps/api/geocode/json?lang=zh_tw&key=AIzaSyA8po2vdaDRImo9JDKReL8t61wEcpKXsBU&address=' + msg_input_2_utf

  // 透過上述找到的經緯度來搜尋時間，必須含有憑證KEY值，location，還有timestamp
  // 說明網址https://developers.google.com/maps/documentation/timezone/intro?hl=zh-tw
  const timezone = 'https://maps.googleapis.com/maps/api/timezone/json?key=AIzaSyA8po2vdaDRImo9JDKReL8t61wEcpKXsBU&location='

  // 透過上述找到的經緯度來抓取靜態圖片，必須含有憑證KEY值
  // 說明網址https://developers.google.com/maps/documentation/maps-static/dev-guide
  const staticmap = 'https://maps.googleapis.com/maps/api/staticmap?key=AIzaSyA8po2vdaDRImo9JDKReL8t61wEcpKXsBU&size=200x150&scale=2'
  // console.log('staticmap-->' + staticmap)

  // 透過上述找到的經緯度來搜尋天氣，必須含有憑證appid值和經緯度(lat->經度/lon->緯度)，其中units=metric表示溫度單位為攝氏
  // 說明網址https://openweathermap.org/current#geo
  const openweather = 'https://api.openweathermap.org/data/2.5/weather?lang=zh_tw&units=metric&appid=73fa1b4bc88bdd67a670bb403c68b2c5'
  // ---------------------------------------------------------------
  try {
    // --------------------------------
    const data_area = await rp({
      uri: area,
      json: true
    })
    // console.log(area)
    location_status = data_area.status // 如果此值不是OK表示他找不到地名
    // console.log('status--' + location_status + '**********')
    if (location_status === 'OK') {
      // console.log('in')

      location_lat = data_area.results[0].geometry.location.lat // 輸入地址的經度
      location_lng = data_area.results[0].geometry.location.lng // 輸入地址的緯度
      place_id = data_area.results[0].place_id // 輸入地址的ID
      try {
        google_map_url = google_map_url + '&query=' + location_lat + ',' + location_lng + '&query_place_id=' + place_id

        // ----------------------------
        // 設定靜態地度圖放大大小用
        let zoom = 10
        const types = data_area.results[0].types[0]
        // console.log('types--' + types + '**********')
        if (types == 'country' || types == 'establishment') {
          zoom = 3
        }
        // 由豎線（|）字符分隔，對應google規則要轉換成%7C取代
        staticmap_url = staticmap + '&zoom=' + zoom + '&center=' + location_lat + ',' + location_lng + '&markers=color:red%7Clabel:L%7C' + location_lat + ',' + location_lng
        // console.log('staticmap_url-->' + staticmap_url)
        // 組成google timezone api所需的網址
        const timezone_url = timezone + location_lat + ',' + location_lng + '&timestamp=' + timestamp
        // console.log('timezone_url-->' + timezone_url)
        const data_timezone = await rp({
          uri: timezone_url,
          json: true
        })
        // console.log(data_timezone)
        timezone_dstOffset = data_timezone.dstOffset // google api丟出來的值，表夏令時的偏移量（以秒為單位）
        timezone_rawOffset = data_timezone.rawOffset // google api丟出來的值，表給定位置與UTC的偏移量（以秒為單位）
        // console.log(timezone_dstOffset + '********')
        // console.log(timezone_rawOffset + '********')
        // console.log(timestamp + timezone_dstOffset + timezone_rawOffset)

        // 要轉換成世界標準時間就是將timestamp、timezone_dstOffset和timezone_rawOffset三個數字相加，再乘以1000
        // 因為轉乘時間戳是將當前時間除以1000，現在必須復原，所以乘以1000
        // 此為google 規定的，再將其數字轉成UTC時間(世界標準時間)
        const date = new Date((timestamp + timezone_dstOffset + timezone_rawOffset) * 1000)

        const yy = String(date.getUTCFullYear()).length <= 1 ? '0' + date.getUTCFullYear() : date.getUTCFullYear() // 年
        // 月，0表示1月，1表示2月，故得出數字需+1才是正確月份
        const dd = String(date.getUTCDate()).length <= 1 ? '0' + date.getUTCDate() : date.getUTCDate() // 日
        const mm = String((date.getUTCMonth() + 1)).length <= 1 ? '0' + (date.getUTCMonth() + 1) : (date.getUTCMonth() + 1)
        const hh = String(date.getUTCHours()).length <= 1 ? '0' + date.getUTCHours() : date.getUTCHours() // 時
        const MM = String(date.getUTCMinutes()).length <= 1 ? '0' + date.getUTCMinutes() : date.getUTCMinutes() // 分
        const ss = String(date.getUTCSeconds()).length <= 1 ? '0' + date.getUTCSeconds() : date.getUTCSeconds() // 秒

        timezone_msg = yy + '/' + mm + '/' + dd + ', ' + hh + ':' + MM + ':' + ss + '\n'

        const openweather_url = openweather + '&lat=' + location_lat + '&lon=' + location_lng
        // console.log('openweather_url-->' + openweather_url)
        const data_openweather = await rp({
          uri: openweather_url,
          json: true
        })

        weather_description = data_openweather.weather[0].description // 天氣情況
        const weather_icon = data_openweather.weather[0].icon // 天氣圖標ID
        weather_icon_url = 'https://openweathermap.org/img/wn/' + weather_icon + '.png' // 天氣圖標url
        // console.log('weather_icon_url-->' + weather_icon_url)
        main_temp = Math.round(data_openweather.main.temp) + '°C' // 當前溫度，四捨五入
        main_feels_like = Math.round(data_openweather.main.feels_like) + '°C' // 體感溫度，四捨五入
        main_pressure = data_openweather.main.pressure + 'hPa' // 氣壓
        main_humidity = data_openweather.main.humidity + '％' // 濕度
        wind_speed = data_openweather.wind.speed + 'm/s' // 風速

        // const weather_msg = '天氣狀況：' + weather_description + '\n氣溫：' + main_temp + '°C\n體感溫度：' + main_feels_like +
        //             '°C\n氣壓：' + main_pressure + 'hPa\n濕度：' + main_humidity + '％\n風速：' + wind_speed + 'm/s'

        sticker_packageId = 11537
        sticker_stickerId = 52002745
        // msg = timezone_msg + weather_msg
        err_msg = ''
      } catch (error) {
        sticker_packageId = 11537
        sticker_stickerId = 52002757
        err_msg = '發生錯誤'
      }
    } else {
      sticker_packageId = 11538
      sticker_stickerId = 51626518
      err_msg = '請輸入正確的地名'
    }

    // ---------------------------------------------------------------
  } catch (error) {
    sticker_packageId = 11537
    sticker_stickerId = 52002765
    err_msg = '發生錯誤'
  }
  // ----------------------------
  // 設定天氣狀況欄位寬度用，針對狀況有幾個字來設定大小
  let weather_description_width = 0
  switch (weather_description.length) {
    case 1:
      weather_description_width = '33%'
      break
    case 2:
      weather_description_width = '40%'
      break
    default:
      weather_description_width = '50%'
      break
  }
  // console.log(err_msg)
  const sticker_msg = {
    type: 'sticker',
    packageId: sticker_packageId,
    stickerId: sticker_stickerId
  } // 貼圖msg
  const text_msg = {
    type: 'text',
    text: err_msg
  }
  const flex_msg_addres = {
    type: 'flex',
    altText: msg_input + ' 的資訊',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'text',
          text: '即時天氣概況',
          size: 'xl',
          weight: 'bold',
          color: '#2894FF'
        }]
      },
      hero: {
        type: 'image',
        url: staticmap_url,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        action: {
          type: 'uri',
          uri: google_map_url
        }
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [{
            type: 'text',
            text: msg_input,
            weight: 'bold',
            size: 'xl',
            contents: [],
            color: '#FF7575'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [{
                type: 'box',
                layout: 'vertical',
                contents: [{
                  type: 'text',
                  contents: [{
                      type: 'span',
                      text: '當前時間：',
                      weight: 'bold',
                      size: 'sm'
                    },
                    {
                      type: 'span',
                      text: timezone_msg
                    }
                  ]
                }],
                offsetTop: '20px'
              }, {
                type: 'box',
                layout: 'horizontal',
                margin: 'lg',
                spacing: 'sm',
                contents: [{
                    type: 'box',
                    layout: 'baseline',
                    spacing: 'sm',
                    contents: [{
                      type: 'text',
                      size: 'sm',
                      gravity: 'center',
                      contents: [{
                          type: 'span',
                          text: '天氣狀況：',
                          weight: 'bold'
                        },
                        {
                          type: 'span',
                          text: weather_description
                        }
                      ]
                    }],
                    width: weather_description_width
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{
                      type: 'image',
                      url: weather_icon_url,
                      size: 'xxs'
                    }],
                    width: '50px',
                    offsetBottom: '10px'
                  }
                ],
                offsetTop: '10px'
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  // {
                  //   type: 'text',
                  //   contents: [{
                  //       type: 'span',
                  //       text: '當前時間：',
                  //       weight: 'bold',
                  //       size: 'sm'
                  //     },
                  //     {
                  //       type: 'span',
                  //       text: timezone_msg
                  //     }
                  //   ]
                  // },
                  {
                    type: 'text',
                    text: '氣溫：' + main_temp
                  },
                  {
                    type: 'text',
                    text: '體感溫度：' + main_feels_like
                  },
                  {
                    type: 'text',
                    text: '氣壓：' + main_pressure
                  },
                  {
                    type: 'text',
                    text: '濕度：' + main_humidity
                  },
                  {
                    type: 'text',
                    text: '風速：' + wind_speed
                  }
                ]
              }
            ],
            offsetBottom: '10px'
          }
        ],
        paddingBottom: '0px'
      },
      // {
      //   type: 'box',
      //   layout: 'horizontal',
      //   contents: [{
      //     type: 'text',
      //     text: '當前時間：',
      //     weight: 'bold',
      //     contents: [{
      //         type: 'span',
      //         text: '當前時間：',
      //         weight: 'bold'
      //       },
      //       {
      //         type: 'span',
      //         text: timezone_msg,
      //         weight: 'regular'
      //       }
      //     ]
      //   }],
      //   paddingTop: '10px'
      // },
      // {
      //   type: 'box',
      //   layout: 'horizontal',
      //   contents: [{
      //       type: 'box',
      //       layout: 'vertical',
      //       contents: [{
      //         type: 'text',
      //         text: '天氣狀況：',
      //         weight: 'bold',
      //         contents: [{
      //             type: 'span',
      //             text: '天氣狀況：'
      //           },
      //           {
      //             type: 'span',
      //             text: weather_description,
      //             weight: 'regular'
      //           }
      //         ]
      //       }],
      //       width: weather_description_width
      //     },
      //     {
      //       type: 'box',
      //       layout: 'vertical',
      //       contents: [{
      //         type: 'image',
      //         url: weather_icon_url,
      //         size: 'xxs'
      //       }],
      //       width: '50px',
      //       height: '50px',
      //       // offsetBottom: '10px'
      //     }
      //   ],
      //   paddingTop: '0px'
      // },
      // {
      //   type: 'box',
      //   layout: 'vertical',
      //   contents: [{
      //       type: 'text',
      //       text: '氣溫：' + main_temp
      //     },
      //     {
      //       type: 'text',
      //       text: '體感溫度：' + main_feels_like
      //     },
      //     {
      //       type: 'text',
      //       text: '氣壓：' + main_pressure
      //     },
      //     {
      //       type: 'text',
      //       text: '濕度：' + main_humidity
      //     },
      //     {
      //       type: 'text',
      //       text: '風速：' + wind_speed
      //     }
      //   ],
      //   // offsetBottom: '30px'
      // }
      // ]
      // },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [{
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: '前往Google地圖',
            uri: google_map_url
          }
        }],
        flex: 0
      },
      styles: {
        // header: {
        //   backgroundColor: '#bdf6ff'
        // },
        // hero: {
        //   backgroundColor: '#d26671'
        // },
        // body: {
        //   backgroundColor: '#ffffaa'
        // },
        footer: {
          backgroundColor: '#ECF5FF'
        }
      }
    }
  }

  // 判斷有無錯誤訊息，若有則回傳錯誤提醒，若無則回傳flex_msg
  const msg = err_msg != '' ? text_msg : flex_msg_addres

  event.reply([sticker_msg, msg

  ])
  // event.reply(msg)
  // console.log(////////////////////////////////)
  // console.log(msg_input + '**********')
  // console.log(msg_input_2_utf + '**********')
  // console.log(area)
  // console.log(location_lat)
  // console.log(location_lng)
  // console.log('==============================')
  // ---------------------------------------------------------------
})

//
//
// // -------------------------
// // richmenu
// const client = new bot_sdk.Client({
//   channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
// });
// const richmenu = {
//   size: {
//     width: 2500,
//     height: 1686
//   },
//   selected: true,
//   name: 'Nice richmenu',
//   chatBarText: 'Tap to open',
//   areas: [
//     {
//       bounds: {
//         x: 0,
//         y: 0,
//         width: 2500,
//         height: 1686
//       },
//       action: {
//         type: 'postback',
//         data: 'action=buy&itemid=123'
//       }
//     }
//   ]
// }
// let RichMenuId=''
// client.createRichMenu(richmenu)
//   .then((richMenuId) =>RichMenuId= richMenuId)
//
// client.setRichMenuImage(richMenuId, fs.createReadStream('https://picsum.photos/200'))
//
// // richmenu-------------------------