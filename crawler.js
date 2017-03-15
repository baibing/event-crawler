import cheerio from 'cheerio';
import https from 'https';
import fs from 'fs';
import moment from 'moment';
import csvWriter from 'csv-write-stream';
const writer = csvWriter({ headers: [ "date", "title", "tag" ] });

// Can only query one year at a time since eventbrite doesn't have year information
const queryYear = 2017;
const startDate = `01%2F01%2F${queryYear}`;
const endDate = (queryYear === 2017) ? moment().format('MM%2FD%2FY') : moment(`${queryYear}-12-31`).format('MM%2FD%2FY');
writer.pipe(fs.createWriteStream(`${queryYear}-events.csv`));

let options = {
  hostname: 'www.eventbrite.com',
  port: 443,
  path: `/d/wa--seattle/events/?crt=regular&end_date=${endDate}&sort=best&start_date=${startDate}`,
  headers: {
    Accept: '*/*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
  },
  method: 'GET'
};

https.get(options, (res) => {
  let data = "";
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', (chunk) => {
    const $ = cheerio.load(data, {
      normalizeWhitespace: true
    });
    $('.pagination__navigation-group li a').each((index, element) => {
      options.path = `/d/wa--seattle/events/?crt=regular&end_date=${endDate}&page=${index + 1}&sort=best&start_date=${startDate}`;
      https.get(options, (res) => {
        let paginatedData = "";
        res.on('data', (chunk) => {
          paginatedData += chunk;
        });
        res.on('end', (chunk) => {
          const paginatedHtml = cheerio.load(paginatedData, {
            normalizeWhitespace: true
          });
          paginatedHtml('.list-card-v2.l-mar-top-2.js-d-poster').each((index, element) => {
            const date = moment(element.children[ 1 ].children[ 3 ].children[ 1 ].children[0].data, 'ddd, MMM D h:m A').year(queryYear);
            const title = element.children[ 1 ].children[ 3 ].children[ 3 ].children[ 0 ].data;
            const tags = element.children[ 3 ].children[ 1 ].children
              .filter(tagElement => tagElement.name === "a")
              .map(tagElement => tagElement.children[ 0 ].data);

            tags.forEach(tag => {
              writer.write([ date.format('Y-M-D H:m'), title, tag ]);
            });
          });
        })
      }).on('error', (e) => {
        console.error("error", e);
      });
    });
//    writer.end();
  })
}).on('error', (e) => {
  console.error("error", e);
});

