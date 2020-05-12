// 引用linebot 套件
import linebot from 'linebot'
// 引用 dotenv 套件
import dotenv from 'dotenv'

// 引用 request
import rp from 'request-promise'

// 讀取 .env 檔
dotenv.config()

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
})
// 當收到訊息時
bot.on('message', async (event) => {
  let msg = ''

  // --------------------------------
  const msg_input = event.message.text // 此為輸入內容
  const msg_input_2_utf = encodeURIComponent(msg_input) // 轉換成UTF8，電腦語言
  let location_lat = '' // 輸入地址的經度
  let location_lng = '' // 輸入地址的緯度
  let location_status = ''

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

  // 透過上述找到的經緯度來搜尋天氣，必須含有憑證appid值和經緯度(lat->經度/lon->緯度)，其中units=metric表示溫度單位為攝氏
  // 說明網址https://openweathermap.org/current#geo
  const openweather = 'https://api.openweathermap.org/data/2.5/weather?lang=zh_tw&units=metric&appid=73fa1b4bc88bdd67a670bb403c68b2c5'
  // ---------------------------------------------------------------
  try {
    // --------------------------------
    const data_area = await rp({ uri: area, json: true })
    // console.log(data_area)
    location_status = data_area.status // 如果此值不是OK表示他找不到地名
    // console.log('status--' + location_status + '**********')
    if (location_status === 'OK') {
      // console.log('in')
      const formatted_address = data_area.results[0].formatted_address
      console.log(formatted_address)
      location_lat = data_area.results[0].geometry.location.lat // 輸入地址的經度
      location_lng = data_area.results[0].geometry.location.lng // 輸入地址的緯度
      try {
        // 組成google timezone api所需的網址
        const timezone_url = timezone + location_lat + ',' + location_lng + '&timestamp=' + timestamp
        // console.log('timezone_url-->' + timezone_url)
        const data_timezone = await rp({ uri: timezone_url, json: true })
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
        const date_utc = date.toUTCString()
        // console.log('date_utc-->' + date_utc)

        const yy = String(date.getUTCFullYear()).length <= 1 ? '0' + date.getUTCFullYear() : date.getUTCFullYear() // 年
        // 月，0表示1月，1表示2月，故得出數字需+1才是正確月份
        const dd = String(date.getUTCDate()).length <= 1 ? '0' + date.getUTCDate() : date.getUTCDate() // 日
        const mm = String((date.getUTCMonth() + 1)).length <= 1 ? '0' + (date.getUTCMonth() + 1) : (date.getUTCMonth() + 1)
        const hh = String(date.getUTCHours()).length <= 1 ? '0' + date.getUTCHours() : date.getUTCHours() // 時
        const MM = String(date.getUTCMinutes()).length <= 1 ? '0' + date.getUTCMinutes() : date.getUTCMinutes() // 分
        const ss = String(date.getUTCSeconds()).length <= 1 ? '0' + date.getUTCSeconds() : date.getUTCSeconds() // 秒

        // const yy = date.getUTCFullYear() // 年
        // const mm = date.getUTCMonth() + 1 // 月，0表示1月，1表示2月，故得出數字需+1才是正確月份
        // const dd = date.getUTCDate() // 日
        // const hh = date.getUTCHours() // 時
        // const MM = date.getUTCMinutes() // 分
        // const ss = date.getUTCSeconds() // 秒

        const timezone_msg = formatted_address + '\n當前時間為' + yy + '/' + mm + '/' + dd + ', ' + hh + ':' + MM + ':' + ss + '\n'

        const openweather_url = openweather + '&lat=' + location_lat + '&lon=' + location_lng
        // console.log('openweather_url-->' + openweather_url)
        const data_openweather = await rp({ uri: openweather_url, json: true })

        const weather_description = data_openweather.weather[0].description // 天氣情況
        const weather_icon = data_openweather.weather[0].icon // 天氣圖標ID
        const weather_icon_url = 'http://openweathermap.org/img/wn/' + weather_icon + '.png' // 天氣圖標url
        const main_temp = Math.round(data_openweather.main.temp) // 當前溫度，四捨五入
        const main_feels_like = Math.round(data_openweather.main.feels_like) // 體感溫度，四捨五入
        const main_pressure = data_openweather.main.pressure // 氣壓
        const main_humidity = data_openweather.main.humidity // 濕度
        const wind_speed = data_openweather.wind.speed // 風速

        const weather_msg = '天氣狀況：' + weather_description + '\n氣溫：' + main_temp + '°C\n體感溫度：' + main_feels_like +
                    '°C\n氣壓：' + main_pressure + 'hPa\n濕度：' + main_humidity + '％\n風速：' + wind_speed + 'm/s'

        sticker_packageId = 11537
        sticker_stickerId = 52002745
        msg = timezone_msg + weather_msg
      } catch (error) {
        sticker_packageId = 11537
        sticker_stickerId = 52002757
        msg = '發生錯誤'
      }
    } else {
      sticker_packageId = 11538
      sticker_stickerId = 51626518
      msg = '請輸入正確的地名'
    }

    // ---------------------------------------------------------------
  } catch (error) {
    sticker_packageId = 11537
    sticker_stickerId = 52002765
    msg = '發生錯誤'
  }
  // ----------------------------
  event.reply([{ type: 'sticker', packageId: sticker_packageId, stickerId: sticker_stickerId },
    { type: 'text',text: msg}])
  // event.reply(msg)
  // console.log(////////////////////////////////)
  // console.log(msg_input + '**********')
  // console.log(msg_input_2_utf + '**********')
  // console.log(area)
  // console.log(location_lat)
  // console.log(location_lng)
  // console.log('==============================')
  // ---------------------------------------------------------------

  // event.reply(msg)
})
// 在 port 啟動
bot.listen('/', process.env.PORT, () => {
  console.log('機器人已啟動')
})
