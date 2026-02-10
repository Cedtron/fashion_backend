# IAM Role Setup for EC2 (No Access Keys Needed)

## Why Use IAM Roles?
- **More Secure**: No hardcoded credentials in your code
- **Automatic**: Credentials rotate automatically
- **Best Practice**: Recommended by AWS for EC2 instances

## Setup Steps

### 1. Create IAM Role for EC2

1. Go to AWS Console → IAM → Roles
2. Click "Create role"
3. Select "AWS service" → "EC2"
4. Click "Next"

### 2. Attach Policies

Attach these policies to the role:
- **AmazonS3FullAccess** (for S3 operations)
- **AmazonRekognitionFullAccess** (for image recognition)

Or create a custom policy with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::fash/*",
        "arn:aws:s3:::fash"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectLabels",
        "rekognition:DetectText",
        "rekognition:SearchFacesByImage"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. Name the Role

Give it a name like: `fashion-house-ec2-role`

### 4. Attach Role to EC2 Instance

1. Go to EC2 Console
2. Select your instance
3. Actions → Security → Modify IAM role
4. Select `fashion-house-ec2-role`
5. Click "Update IAM role"

### 5. Update .env File

Set this in your `.env`:
```env
USE_IAM_ROLE=true
```

You can remove or comment out the access keys:
```env
# AWS_ACCESS_KEY_ID=...  (not needed with IAM role)
# AWS_SECRET_ACCESS_KEY=...  (not needed with IAM role)
```

### 6. Restart Your Application

```bash
pm2 restart fashion-backend
# or
npm run start:prod
```

## Verification

Check the logs when your app starts:
- ✅ Should see: "S3 Service initialized with IAM Role"
- ✅ Should see: "S3 Bucket exists: fash"

## Fallback to Local Storage

If S3 fails for any reason:
- App will continue running
- Images will be saved to `/uploads/stock/` locally
- No errors or crashes

## For Local Development

On your local machine (not EC2), set:
```env
USE_IAM_ROLE=false
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

This way you can use access keys locally and IAM roles in production.
