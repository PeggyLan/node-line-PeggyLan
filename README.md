# Hello Word 即時天氣&時間
 
### ID @797lbdfu

![Alt text](https://github.com/PeggyLan/node-line-PeggyLan/blob/master/bot_qrcode.png)

## 使用說明
### 可輸入
1.國家<br>
2.地區<br>
3.詳細地址<br>
4.地點<br>
5.想查詢地點的任意資料<br>

### 產出結果
1.查詢地點<br>
2.當地時間<br>
3.當地天氣狀況<br>
4.其他詳細天氣資訊<br>
5.前往google地圖<br>

## 串聯之api
### 1. 利用輸入地址找經緯度，使用google geocode api，必須含有憑證KEY值，address為地址
https://developers.google.com/maps/documentation/geocoding/start
### 2. 透過上述找到的經緯度來搜尋時間，必須含有憑證KEY值，location，還有timestamp
https://developers.google.com/maps/documentation/timezone/intro?hl=zh-tw
### 3. 透過上述找到的經緯度來抓取靜態圖片，必須含有憑證KEY值
https://developers.google.com/maps/documentation/maps-static/dev-guide
### 4. 透過上述找到的經緯度來搜尋天氣，必須含有憑證appid值和經緯度(lat->經度/lon->緯度)，其中units=metric表示溫度單位為攝氏
https://openweathermap.org/current#geo
