const { S3Client, ListBucketsCommand, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function testAWSCredentials() {
  console.log('🔐 Testing AWS Credentials...\n');

  // Check if credentials are set
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';
  const bucketName = process.env.S3_BUCKET_NAME || 'fash';

  console.log('📋 Configuration:');
  console.log(`   Access Key ID: ${accessKeyId ? accessKeyId.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`   Secret Key: ${secretAccessKey ? '***' + secretAccessKey.substring(secretAccessKey.length - 4) : 'NOT SET'}`);
  console.log(`   Region: ${region}`);
  console.log(`   Bucket Name: ${bucketName}\n`);

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ AWS credentials are not set in .env file');
    return;
  }

  // Create S3 client
  const s3Client = new S3Client({
    region: region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });

  try {
    // Test 1: List buckets (basic credential test)
    console.log('🧪 Test 1: Listing S3 buckets...');
    const listCommand = new ListBucketsCommand({});
    const listResponse = await s3Client.send(listCommand);
    
    console.log('✅ Credentials are valid!');
    console.log(`📦 Found ${listResponse.Buckets.length} buckets:`);
    listResponse.Buckets.forEach(bucket => {
      console.log(`   - ${bucket.Name} (created: ${bucket.CreationDate})`);
    });

    // Test 2: Check if our specific bucket exists
    console.log(`\n🧪 Test 2: Checking bucket '${bucketName}'...`);
    try {
      const headCommand = new HeadBucketCommand({ Bucket: bucketName });
      await s3Client.send(headCommand);
      console.log(`✅ Bucket '${bucketName}' exists and is accessible`);
    } catch (headError) {
      if (headError.name === 'NotFound') {
        console.log(`⚠️  Bucket '${bucketName}' does not exist`);
        
        // Test 3: Try to create the bucket
        console.log(`🧪 Test 3: Attempting to create bucket '${bucketName}'...`);
        try {
          const createCommand = new CreateBucketCommand({ 
            Bucket: bucketName,
            // Note: For us-east-1, we don't specify LocationConstraint
          });
          await s3Client.send(createCommand);
          console.log(`✅ Successfully created bucket '${bucketName}'`);
        } catch (createError) {
          console.error(`❌ Failed to create bucket: ${createError.message}`);
          if (createError.name === 'BucketAlreadyOwnedByYou') {
            console.log('✅ Bucket already exists and is owned by you');
          }
        }
      } else {
        console.error(`❌ Error accessing bucket: ${headError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ AWS Credential Test Failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.name}`);
    
    if (error.name === 'InvalidAccessKeyId') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check if AWS_ACCESS_KEY_ID is correct');
      console.log('   - Verify the key is active in AWS IAM console');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check if AWS_SECRET_ACCESS_KEY is correct');
      console.log('   - Make sure there are no extra spaces in the key');
    } else if (error.name === 'AccessDenied') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Your credentials work but lack S3 permissions');
      console.log('   - Add S3 policies to your IAM user/role');
    }
  }
}

testAWSCredentials().catch(console.error);