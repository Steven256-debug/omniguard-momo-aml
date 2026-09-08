import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const DISTRIBUTION_ID = 'EZ8018C30D86S';

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function hash(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

async function run() {
  // 1. Read AWS credentials
  const credsPath = path.join(os.homedir(), '.aws', 'credentials');
  const credsContent = fs.readFileSync(credsPath, 'utf8');
  const accessKeyMatch = credsContent.match(/aws_access_key_id\s*=\s*([^\r\n]+)/i);
  const secretKeyMatch = credsContent.match(/aws_secret_access_key\s*=\s*([^\r\n]+)/i);
  const sessionTokenMatch = credsContent.match(/aws_session_token\s*=\s*([^\r\n]+)/i);

  const accessKey = (process.env.AWS_ACCESS_KEY_ID || (accessKeyMatch && accessKeyMatch[1])).trim();
  const secretKey = (process.env.AWS_SECRET_ACCESS_KEY || (secretKeyMatch && secretKeyMatch[1])).trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN || (sessionTokenMatch ? sessionTokenMatch[1].trim() : null);

  // 2. Fetch true AWS server time
  console.log('Fetching true AWS server time...');
  const awsTime = await new Promise((resolve) => {
    const req = https.request('https://cloudfront.amazonaws.com', { method: 'HEAD' }, (res) => {
      if (res.headers['date']) {
        console.log('AWS Server Date:', res.headers['date']);
        resolve(new Date(res.headers['date']));
      } else {
        resolve(new Date());
      }
    });
    req.on('error', () => resolve(new Date()));
    req.end();
  });

  const amzDate = awsTime.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const region = 'us-east-1';
  const service = 'cloudfront';
  const host = 'cloudfront.amazonaws.com';
  const method = 'POST';
  const canonicalUri = `/2020-05-31/distribution/${DISTRIBUTION_ID}/invalidation`;

  const callerRef = 'inv-' + Date.now();
  const body = `<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2020-05-31/">
  <Paths>
    <Quantity>1</Quantity>
    <Items>
      <Path>/*</Path>
    </Items>
  </Paths>
  <CallerReference>${callerRef}</CallerReference>
</InvalidationBatch>`;

  const payloadHash = hash(body);

  let canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
  let signedHeaders = 'host;x-amz-date';

  if (sessionToken) {
    canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\nx-amz-security-token:${sessionToken}\n`;
    signedHeaders = 'host;x-amz-date;x-amz-security-token';
  }

  const canonicalRequest = `${method}\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${hash(canonicalRequest)}`;

  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const reqHeaders = {
    'Host': host,
    'x-amz-date': amzDate,
    'Authorization': authorizationHeader,
    'Content-Type': 'application/xml',
    'Content-Length': Buffer.byteLength(body)
  };

  if (sessionToken) {
    reqHeaders['x-amz-security-token'] = sessionToken;
  }

  console.log('Sending Invalidation request to CloudFront...');
  const result = await new Promise((resolve, reject) => {
    const req = https.request(`https://${host}${canonicalUri}`, {
      method: method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Response:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  if (result.status === 201) {
    console.log('SUCCESS: CloudFront cache invalidation created successfully!');
  }
}

run().catch(console.error);
