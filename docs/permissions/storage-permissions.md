# Storage Permissions & Access Control

## S3 Storage Configuration

### Amplify Storage Categories

AWS Amplify Storage provides three access levels for S3 objects:

1. **Public**: Accessible by all users
2. **Protected**: Readable by all users, writable by the owner
3. **Private**: Accessible only by the owner

### Storage Configuration

```json
{
  "resourceName": "amplifyPermissionsStorage",
  "policyUUID": "unique-policy-id",
  "bucketName": "amplify-permissions-storage-bucket",
  "authPolicyName": "s3_amplify_permissions_auth_policy",
  "unauthPolicyName": "s3_amplify_permissions_unauth_policy",
  "authRoleName": "amplify-permissions-authRole",
  "unauthRoleName": "amplify-permissions-unauthRole",
  "selectedGuestAccess": ["s3:GetObject"],
  "selectedAuthenticatedAccess": [
    "s3:GetObject",
    "s3:PutObject",
    "s3:DeleteObject"
  ],
  "s3PermissionsAuthenticatedPublic": ["s3:GetObject"],
  "s3PermissionsAuthenticatedUploads": ["s3:PutObject", "s3:PutObjectAcl"],
  "s3PermissionsAuthenticatedProtected": [
    "s3:GetObject",
    "s3:PutObject",
    "s3:PutObjectAcl",
    "s3:DeleteObject"
  ],
  "s3PermissionsAuthenticatedPrivate": [
    "s3:GetObject",
    "s3:PutObject",
    "s3:PutObjectAcl",
    "s3:DeleteObject"
  ],
  "s3PermissionsGuestPublic": ["s3:GetObject"],
  "s3PermissionsGuestUploads": ["DISALLOW"]
}
```

## IAM Policies for Storage

### Authenticated User Storage Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET/public/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET/protected/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET/protected/${cognito-identity.amazonaws.com:sub}/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET/private/${cognito-identity.amazonaws.com:sub}/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::YOUR-BUCKET",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "public/",
            "public/*",
            "protected/",
            "protected/*",
            "private/${cognito-identity.amazonaws.com:sub}/",
            "private/${cognito-identity.amazonaws.com:sub}/*"
          ]
        }
      }
    }
  ]
}
```

### Admin Storage Policy (Full Access)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::YOUR-BUCKET", "arn:aws:s3:::YOUR-BUCKET/*"]
    }
  ]
}
```

### Guest User Storage Policy (Limited Access)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET/public/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::YOUR-BUCKET",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["public/", "public/*"]
        }
      }
    }
  ]
}
```

## Advanced Storage Patterns

### Group-Based Storage Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AdminGroupAccess",
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET/admin/*",
        "arn:aws:s3:::YOUR-BUCKET/reports/*"
      ],
      "Condition": {
        "ForAnyValue:StringEquals": {
          "cognito:groups": ["Admins"]
        }
      }
    },
    {
      "Sid": "ModeratorGroupAccess",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET/moderation/*",
      "Condition": {
        "ForAnyValue:StringEquals": {
          "cognito:groups": ["Moderators", "Admins"]
        }
      }
    },
    {
      "Sid": "DepartmentBasedAccess",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET/departments/${cognito:custom:department}/*"
    }
  ]
}
```

### Time-Based Access Control

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET/business-hours/*",
      "Condition": {
        "DateGreaterThan": {
          "aws:TokenIssueTime": "08:00Z"
        },
        "DateLessThan": {
          "aws:TokenIssueTime": "18:00Z"
        },
        "ForAnyValue:StringEquals": {
          "aws:RequestedRegion": ["us-east-1", "us-west-2"]
        }
      }
    }
  ]
}
```

## S3 Bucket Policies

### Public Read Access with Restrictions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET/public/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "DenyInsecureConnections",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::YOUR-BUCKET", "arn:aws:s3:::YOUR-BUCKET/*"],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

### Cross-Origin Resource Sharing (CORS)

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    },
    {
      "AllowedOrigins": ["https://yourdomain.com"],
      "AllowedMethods": ["PUT", "POST", "DELETE"],
      "AllowedHeaders": [
        "x-amz-date",
        "x-amz-content-sha256",
        "authorization",
        "content-type"
      ],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

## Client-Side Storage Implementation

### React Components for File Upload

```javascript
import { Storage } from "aws-amplify";
import { useAuthenticator } from "@aws-amplify/ui-react";

function FileUploadComponent() {
  const { user } = useAuthenticator();
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file, accessLevel = "private") => {
    try {
      const result = await Storage.put(`documents/${file.name}`, file, {
        level: accessLevel, // 'public', 'protected', or 'private'
        contentType: file.type,
        progressCallback(progress) {
          setUploadProgress((progress.loaded / progress.total) * 100);
        },
        metadata: {
          owner: user.attributes.sub,
          uploadedAt: new Date().toISOString(),
        },
      });

      console.log("Upload successful:", result);
      return result;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  };

  const downloadFile = async (key, accessLevel = "private") => {
    try {
      const url = await Storage.get(key, {
        level: accessLevel,
        expires: 300, // URL expires in 5 minutes
      });

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      link.download = key.split("/").pop();
      link.click();
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const listFiles = async (prefix = "", accessLevel = "private") => {
    try {
      const files = await Storage.list(prefix, {
        level: accessLevel,
        pageSize: 100,
      });

      return files;
    } catch (error) {
      console.error("List files failed:", error);
      return [];
    }
  };

  const deleteFile = async (key, accessLevel = "private") => {
    try {
      await Storage.remove(key, { level: accessLevel });
      console.log("File deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            uploadFile(file, "private");
          }
        }}
      />
      {uploadProgress > 0 && (
        <div>Upload Progress: {uploadProgress.toFixed(2)}%</div>
      )}
    </div>
  );
}
```

### Admin File Management Component

```javascript
function AdminFileManager() {
  const [allFiles, setAllFiles] = useState([]);
  const { user } = useAuthenticator();

  useEffect(() => {
    // Check if user is admin
    const userGroups =
      user.signInUserSession.accessToken.payload["cognito:groups"] || [];
    if (!userGroups.includes("Admins")) {
      return;
    }

    loadAllFiles();
  }, [user]);

  const loadAllFiles = async () => {
    try {
      // List files from all access levels
      const [publicFiles, protectedFiles, privateFiles] = await Promise.all([
        Storage.list("", { level: "public" }),
        Storage.list("", { level: "protected" }),
        Storage.list("", { level: "private" }),
      ]);

      setAllFiles([
        ...publicFiles.map((f) => ({ ...f, level: "public" })),
        ...protectedFiles.map((f) => ({ ...f, level: "protected" })),
        ...privateFiles.map((f) => ({ ...f, level: "private" })),
      ]);
    } catch (error) {
      console.error("Failed to load files:", error);
    }
  };

  const deleteAnyFile = async (key, level) => {
    try {
      await Storage.remove(key, { level });
      loadAllFiles(); // Refresh list
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  return (
    <div>
      <h3>Admin File Manager</h3>
      {allFiles.map((file, index) => (
        <div
          key={index}
          style={{
            padding: "10px",
            border: "1px solid #ccc",
            margin: "5px 0",
          }}
        >
          <div>
            <strong>Key:</strong> {file.key}
          </div>
          <div>
            <strong>Level:</strong> {file.level}
          </div>
          <div>
            <strong>Size:</strong> {file.size} bytes
          </div>
          <div>
            <strong>Modified:</strong> {file.lastModified}
          </div>
          <button onClick={() => deleteAnyFile(file.key, file.level)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Lambda Functions for Storage Operations

### Pre-Upload Validation

```javascript
// Lambda function triggered before S3 upload
exports.handler = async (event) => {
  const { key, contentType, metadata } = event;
  const userId = event.requestContext.identity.cognitoIdentityId;

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "text/plain",
  ];
  if (!allowedTypes.includes(contentType)) {
    throw new Error("File type not allowed");
  }

  // Validate file size (from metadata)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (metadata.size && parseInt(metadata.size) > maxSize) {
    throw new Error("File size exceeds limit");
  }

  // Check user quota
  const userQuota = await checkUserStorageQuota(userId);
  if (userQuota.exceeded) {
    throw new Error("Storage quota exceeded");
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Upload allowed" }),
  };
};

async function checkUserStorageQuota(userId) {
  // Implement quota checking logic
  // This could involve querying DynamoDB or CloudWatch metrics

  const dynamodb = new AWS.DynamoDB.DocumentClient();

  try {
    const result = await dynamodb
      .get({
        TableName: "UserQuotas",
        Key: { userId },
      })
      .promise();

    const quota = result.Item || { used: 0, limit: 1024 * 1024 * 1024 }; // 1GB default

    return {
      used: quota.used,
      limit: quota.limit,
      exceeded: quota.used >= quota.limit,
    };
  } catch (error) {
    console.error("Error checking quota:", error);
    return { exceeded: false };
  }
}
```

### Post-Upload Processing

```javascript
// Lambda function triggered after S3 upload
exports.handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const size = record.s3.object.size;

    try {
      // Extract user ID from key path
      const pathParts = key.split("/");
      let userId = null;

      if (pathParts[0] === "private" || pathParts[0] === "protected") {
        userId = pathParts[1];
      }

      // Update user quota
      if (userId) {
        await updateUserQuota(userId, size);
      }

      // Trigger virus scanning for certain file types
      if (key.match(/\.(exe|bat|sh|zip|rar)$/i)) {
        await triggerVirusScan(bucket, key);
      }

      // Generate thumbnails for images
      if (key.match(/\.(jpg|jpeg|png|gif)$/i)) {
        await generateThumbnail(bucket, key);
      }

      // Log file upload
      await logFileUpload({
        userId,
        bucket,
        key,
        size,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error processing upload:", error);
    }
  }
};

async function updateUserQuota(userId, additionalSize) {
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  await dynamodb
    .update({
      TableName: "UserQuotas",
      Key: { userId },
      UpdateExpression: "ADD #used :size",
      ExpressionAttributeNames: {
        "#used": "used",
      },
      ExpressionAttributeValues: {
        ":size": additionalSize,
      },
    })
    .promise();
}

async function triggerVirusScan(bucket, key) {
  // Integrate with antivirus service
  const sqs = new AWS.SQS();

  await sqs
    .sendMessage({
      QueueUrl: process.env.VIRUS_SCAN_QUEUE_URL,
      MessageBody: JSON.stringify({
        bucket,
        key,
        timestamp: new Date().toISOString(),
      }),
    })
    .promise();
}

async function generateThumbnail(bucket, key) {
  // Generate thumbnail using Sharp or similar library
  const s3 = new AWS.S3();
  const sharp = require("sharp");

  try {
    // Get original image
    const object = await s3.getObject({ Bucket: bucket, Key: key }).promise();

    // Generate thumbnail
    const thumbnail = await sharp(object.Body)
      .resize(200, 200, { fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload thumbnail
    const thumbnailKey = key.replace(/(\.[^.]+)$/, "_thumb$1");

    await s3
      .putObject({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: "image/jpeg",
      })
      .promise();
  } catch (error) {
    console.error("Error generating thumbnail:", error);
  }
}

async function logFileUpload(uploadInfo) {
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  await dynamodb
    .put({
      TableName: "FileUploads",
      Item: {
        id: generateUUID(),
        ...uploadInfo,
      },
    })
    .promise();
}
```
