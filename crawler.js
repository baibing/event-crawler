import cheerio from 'cheerio';
import https from 'https';
import fs from 'fs';
import moment from 'moment';
import csvWriter from 'csv-write-stream';
const writer = csvWriter({ headers: [ "date", "title", "tag", "location" ] });

// Can only query one year at a time since eventbrite doesn't have year information
const queryYear = 2017;
const startDate = `01%2F01%2F${queryYear}`;
const endDate = (queryYear === 2017) ? moment().format('MM%2FD%2FY') : moment(`${queryYear}-12-31`).format('MM%2FD%2FY');
writer.pipe(fs.createWriteStream(`${queryYear}-events.csv`));

crawlPage(1);

function crawlPage(pageIndex) {
  let options = {
    hostname: 'www.eventbrite.com',
    port: 443,
    path: `/d/us/events/?crt=regular&end_date=${endDate}&page=${pageIndex}&sort=best&start_date=${startDate}`,
    headers: {
      Accept: '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
    },
    method: 'GET'
  };

  https.get(options, (res) => {
    let paginatedData = "";
    res.on('data', (chunk) => {
      paginatedData += chunk;
    });
    res.on('end', (chunk) => {
      const $ = cheerio.load(paginatedData, {
        normalizeWhitespace: true
      });
      if ($('.list-card-v2.l-mar-top-2.js-d-poster').length > 0) {
        crawlPage(pageIndex + 1);
      }
      $('.list-card-v2.l-mar-top-2.js-d-poster').each((index, element) => {
        const date = moment(
          element.children[ 1 ].children[ 3 ].children[ 1 ].children[ 0 ].data,
          'ddd, MMM D h:m A'
        ).year(queryYear);
        const title = element.children[ 1 ].children[ 3 ].children[ 3 ].children[ 0 ].data.trim();
        let location = element.children[ 1 ].children[ 3 ].children[ 5 ].children[ 0 ].data.trim();
        if (location.includes(", ")) {
          location = location.slice(location.indexOf(", ") + 2);
        }
        const tags = element.children[ 3 ].children[ 1 ].children
          .filter(tagElement => tagElement.name === "a")
          .map(tagElement => tagElement.children[ 0 ].data.trim());

        tags.forEach(tag => {
          writer.write([ date.format('Y-M-D H:mm'), title, tag, location ]);
        });
      });
      console.log(`Finish crawling page: ${pageIndex}`);
    })
  }).on('error', (e) => {
    console.error("error", e);
  });
}