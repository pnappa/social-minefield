# Simple AWS Lambda service to check for clickjacking.


Deploying

 - Create an AWS lambda, with proper CORS support for POST requests.

```
# compile
npm install && npm run build
rm -rf node_modules/
npm install --production
cp dist/index.js index.mjs
zip -r upload.zip index.mjs node_modules/
rm index.mjs
# Then, upload zip file to AWS

rm upload.zip

# Test it's working with
curl -X POST -H "Content-Type: application/json" -d '{"url": "https://google.com"}' https://h7cnchzwygu4k3tgjcbuj4cetq0gmkcq.lambda-url.ap-southeast-2.on.aws/
```
