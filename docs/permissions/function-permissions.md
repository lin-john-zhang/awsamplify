# Lambda Function Permissions & Security

## IAM Roles for Lambda Functions

### Basic Lambda Execution Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### Enhanced Lambda Role with AWS Service Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/amplify-*",
        "arn:aws:dynamodb:*:*:table/amplify-*/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::amplify-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminRemoveUserFromGroup"
      ],
      "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
    },
    {
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```

### VPC-Enabled Lambda Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface",
        "ec2:AttachNetworkInterface",
        "ec2:DetachNetworkInterface"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["rds:DescribeDBInstances", "rds:Connect"],
      "Resource": "*"
    }
  ]
}
```

## Lambda Function Examples

### User Management Function

```javascript
// Lambda function for user management operations
const AWS = require("aws-sdk");
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { httpMethod, path, body, requestContext } = event;
  const { authorizer } = requestContext;

  // Extract user information from authorizer context
  const userId = authorizer.userId;
  const userRole = authorizer.userRole;

  try {
    switch (httpMethod) {
      case "GET":
        return await getUserProfile(userId, userRole);
      case "PUT":
        return await updateUserProfile(userId, userRole, JSON.parse(body));
      case "POST":
        return await createUser(userRole, JSON.parse(body));
      case "DELETE":
        return await deleteUser(userId, userRole, path);
      default:
        return createResponse(405, { error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error:", error);
    return createResponse(500, { error: "Internal server error" });
  }
};

async function getUserProfile(userId, userRole) {
  // Users can get their own profile, admins can get any profile
  const targetUserId = event.pathParameters?.userId || userId;

  if (targetUserId !== userId && userRole !== "admin") {
    return createResponse(403, { error: "Insufficient permissions" });
  }

  try {
    // Get user from Cognito
    const cognitoUser = await cognito
      .adminGetUser({
        UserPoolId: process.env.USER_POOL_ID,
        Username: targetUserId,
      })
      .promise();

    // Get additional profile data from DynamoDB
    const profileData = await dynamodb
      .get({
        TableName: process.env.USER_PROFILES_TABLE,
        Key: { userId: targetUserId },
      })
      .promise();

    const profile = {
      userId: targetUserId,
      email: cognitoUser.UserAttributes.find((attr) => attr.Name === "email")
        ?.Value,
      status: cognitoUser.UserStatus,
      ...profileData.Item,
    };

    return createResponse(200, profile);
  } catch (error) {
    if (error.code === "UserNotFoundException") {
      return createResponse(404, { error: "User not found" });
    }
    throw error;
  }
}

async function updateUserProfile(userId, userRole, updateData) {
  const targetUserId = updateData.userId || userId;

  // Permission check
  if (targetUserId !== userId && userRole !== "admin") {
    return createResponse(403, { error: "Insufficient permissions" });
  }

  // Validate update data
  const allowedFields = ["firstName", "lastName", "bio", "preferences"];
  const adminOnlyFields = ["status", "role", "permissions"];

  const filteredData = {};

  for (const [key, value] of Object.entries(updateData)) {
    if (allowedFields.includes(key)) {
      filteredData[key] = value;
    } else if (adminOnlyFields.includes(key) && userRole === "admin") {
      filteredData[key] = value;
    }
  }

  // Update DynamoDB
  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  for (const [key, value] of Object.entries(filteredData)) {
    updateExpression.push(`#${key} = :${key}`);
    expressionAttributeNames[`#${key}`] = key;
    expressionAttributeValues[`:${key}`] = value;
  }

  if (updateExpression.length > 0) {
    await dynamodb
      .update({
        TableName: process.env.USER_PROFILES_TABLE,
        Key: { userId: targetUserId },
        UpdateExpression: `SET ${updateExpression.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
      .promise();
  }

  return createResponse(200, { message: "Profile updated successfully" });
}

async function createUser(userRole, userData) {
  // Only admins can create users
  if (userRole !== "admin") {
    return createResponse(403, { error: "Insufficient permissions" });
  }

  const { email, temporaryPassword, userGroup } = userData;

  try {
    // Create user in Cognito
    const cognitoUser = await cognito
      .adminCreateUser({
        UserPoolId: process.env.USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
        TemporaryPassword: temporaryPassword,
        MessageAction: "SUPPRESS", // Don't send welcome email
      })
      .promise();

    const userId = cognitoUser.User.Username;

    // Add user to group if specified
    if (userGroup) {
      await cognito
        .adminAddUserToGroup({
          UserPoolId: process.env.USER_POOL_ID,
          Username: userId,
          GroupName: userGroup,
        })
        .promise();
    }

    // Create profile in DynamoDB
    await dynamodb
      .put({
        TableName: process.env.USER_PROFILES_TABLE,
        Item: {
          userId,
          email,
          createdAt: new Date().toISOString(),
          status: "active",
        },
      })
      .promise();

    return createResponse(201, {
      userId,
      message: "User created successfully",
    });
  } catch (error) {
    if (error.code === "UsernameExistsException") {
      return createResponse(409, { error: "User already exists" });
    }
    throw error;
  }
}

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "OPTIONS,GET,PUT,POST,DELETE",
    },
    body: JSON.stringify(body),
  };
}
```

### File Processing Function with S3 Permissions

```javascript
// Lambda function for secure file processing
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const sharp = require("sharp");

exports.handler = async (event) => {
  for (const record of event.Records) {
    try {
      await processS3Upload(record);
    } catch (error) {
      console.error("Error processing file:", error);
    }
  }
};

async function processS3Upload(record) {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

  // Validate file path structure
  const pathValidation = validateFilePath(key);
  if (!pathValidation.valid) {
    console.warn("Invalid file path:", key);
    return;
  }

  const { accessLevel, userId, fileName } = pathValidation;

  // Security checks
  await performSecurityChecks(bucket, key, userId);

  // Process based on file type
  const fileExtension = fileName.split(".").pop().toLowerCase();

  switch (fileExtension) {
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      await processImage(bucket, key, accessLevel, userId);
      break;
    case "pdf":
      await processPDF(bucket, key, accessLevel, userId);
      break;
    case "doc":
    case "docx":
      await processDocument(bucket, key, accessLevel, userId);
      break;
    default:
      console.log("No special processing needed for file type:", fileExtension);
  }

  // Update file metadata
  await updateFileMetadata(bucket, key, userId);
}

function validateFilePath(key) {
  // Expected format: {accessLevel}/{userId?}/{filename}
  const pathParts = key.split("/");

  if (pathParts.length < 2) {
    return { valid: false };
  }

  const accessLevel = pathParts[0];
  const validAccessLevels = ["public", "protected", "private"];

  if (!validAccessLevels.includes(accessLevel)) {
    return { valid: false };
  }

  let userId = null;
  let fileName = null;

  if (accessLevel === "public") {
    fileName = pathParts.slice(1).join("/");
  } else {
    if (pathParts.length < 3) {
      return { valid: false };
    }
    userId = pathParts[1];
    fileName = pathParts.slice(2).join("/");
  }

  return {
    valid: true,
    accessLevel,
    userId,
    fileName,
  };
}

async function performSecurityChecks(bucket, key, userId) {
  // Check file size
  const headResult = await s3
    .headObject({ Bucket: bucket, Key: key })
    .promise();
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (headResult.ContentLength > maxSize) {
    await quarantineFile(bucket, key, "File size exceeds limit");
    throw new Error("File size exceeds limit");
  }

  // Check file type based on content (not just extension)
  const fileBuffer = await getFileBuffer(bucket, key, 1024); // First 1KB
  const actualMimeType = getActualMimeType(fileBuffer);
  const declaredMimeType = headResult.ContentType;

  if (actualMimeType !== declaredMimeType) {
    await quarantineFile(bucket, key, "MIME type mismatch");
    throw new Error("MIME type mismatch detected");
  }

  // Virus scanning (integrate with your antivirus service)
  const scanResult = await performVirusScan(bucket, key);
  if (!scanResult.clean) {
    await quarantineFile(bucket, key, "Virus detected");
    throw new Error("Virus detected in file");
  }

  // Check user quota
  if (userId) {
    const quotaExceeded = await checkUserQuota(
      userId,
      headResult.ContentLength
    );
    if (quotaExceeded) {
      await s3.deleteObject({ Bucket: bucket, Key: key }).promise();
      throw new Error("User storage quota exceeded");
    }
  }
}

async function processImage(bucket, key, accessLevel, userId) {
  try {
    // Get the image
    const object = await s3.getObject({ Bucket: bucket, Key: key }).promise();

    // Generate thumbnails
    const thumbnailSizes = [150, 300, 600];

    for (const size of thumbnailSizes) {
      const thumbnail = await sharp(object.Body)
        .resize(size, size, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailKey = key.replace(/(\.[^.]+)$/, `_${size}$1`);

      await s3
        .putObject({
          Bucket: bucket,
          Key: thumbnailKey,
          Body: thumbnail,
          ContentType: "image/jpeg",
          Metadata: {
            "original-file": key,
            "thumbnail-size": size.toString(),
            "generated-by": "lambda-processor",
          },
        })
        .promise();
    }

    // Extract metadata
    const metadata = await sharp(object.Body).metadata();

    // Store image metadata in DynamoDB
    await storeFileMetadata({
      bucket,
      key,
      userId,
      type: "image",
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: object.Body.length,
      },
    });
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}

async function quarantineFile(bucket, key, reason) {
  const quarantineBucket = process.env.QUARANTINE_BUCKET;
  const quarantineKey = `quarantine/${Date.now()}_${key}`;

  try {
    // Copy to quarantine bucket
    await s3
      .copyObject({
        Bucket: quarantineBucket,
        Key: quarantineKey,
        CopySource: `${bucket}/${key}`,
        Metadata: {
          "quarantine-reason": reason,
          "quarantine-timestamp": new Date().toISOString(),
          "original-bucket": bucket,
          "original-key": key,
        },
        MetadataDirective: "REPLACE",
      })
      .promise();

    // Delete from original location
    await s3.deleteObject({ Bucket: bucket, Key: key }).promise();

    // Log quarantine action
    console.log(
      `File quarantined: ${key} -> ${quarantineKey}, Reason: ${reason}`
    );

    // Notify administrators
    await notifyAdmins({
      action: "file_quarantined",
      originalKey: key,
      quarantineKey,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error quarantining file:", error);
    throw error;
  }
}

async function storeFileMetadata(data) {
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  await dynamodb
    .put({
      TableName: process.env.FILE_METADATA_TABLE,
      Item: {
        id: generateUUID(),
        bucket: data.bucket,
        key: data.key,
        userId: data.userId,
        type: data.type,
        metadata: data.metadata,
        processedAt: new Date().toISOString(),
      },
    })
    .promise();
}

async function checkUserQuota(userId, additionalSize) {
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  try {
    const result = await dynamodb
      .get({
        TableName: process.env.USER_QUOTAS_TABLE,
        Key: { userId },
      })
      .promise();

    const quota = result.Item || { used: 0, limit: 1024 * 1024 * 1024 }; // 1GB default

    return quota.used + additionalSize > quota.limit;
  } catch (error) {
    console.error("Error checking quota:", error);
    return false; // Allow upload if quota check fails
  }
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
```

### Database Access Function with Fine-Grained Permissions

```javascript
// Lambda function with conditional database access
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { httpMethod, pathParameters, body, requestContext } = event;
  const { authorizer } = requestContext;

  // Extract user context
  const userId = authorizer.userId;
  const userGroups = authorizer.userGroups
    ? authorizer.userGroups.split(",")
    : [];
  const userRole = authorizer.userRole;

  try {
    switch (httpMethod) {
      case "GET":
        return await getData(pathParameters, userId, userGroups, userRole);
      case "POST":
        return await createData(JSON.parse(body), userId, userGroups, userRole);
      case "PUT":
        return await updateData(
          pathParameters,
          JSON.parse(body),
          userId,
          userGroups,
          userRole
        );
      case "DELETE":
        return await deleteData(pathParameters, userId, userGroups, userRole);
      default:
        return createResponse(405, { error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error:", error);

    if (error.name === "AccessDeniedError") {
      return createResponse(403, { error: error.message });
    }

    return createResponse(500, { error: "Internal server error" });
  }
};

async function getData(pathParameters, userId, userGroups, userRole) {
  const { dataType, itemId } = pathParameters;

  // Determine access permissions
  const accessControl = getAccessControl(dataType, userGroups, userRole);

  if (itemId) {
    // Get specific item
    return await getSingleItem(dataType, itemId, userId, accessControl);
  } else {
    // List items
    return await listItems(dataType, userId, accessControl);
  }
}

async function getSingleItem(dataType, itemId, userId, accessControl) {
  const item = await dynamodb
    .get({
      TableName: getTableName(dataType),
      Key: { id: itemId },
    })
    .promise();

  if (!item.Item) {
    return createResponse(404, { error: "Item not found" });
  }

  // Check if user can access this specific item
  if (!canAccessItem(item.Item, userId, accessControl)) {
    throw new AccessDeniedError("Insufficient permissions to access this item");
  }

  // Filter fields based on permissions
  const filteredItem = filterItemFields(item.Item, accessControl);

  return createResponse(200, filteredItem);
}

async function listItems(dataType, userId, accessControl) {
  const tableName = getTableName(dataType);
  let queryParams = {
    TableName: tableName,
  };

  // Apply access-based filtering
  if (accessControl.scope === "owner") {
    // Only show items owned by the user
    queryParams.FilterExpression = "#owner = :userId";
    queryParams.ExpressionAttributeNames = { "#owner": "owner" };
    queryParams.ExpressionAttributeValues = { ":userId": userId };
  } else if (accessControl.scope === "department") {
    // Show items from user's department
    const userDepartment = await getUserDepartment(userId);
    queryParams.FilterExpression = "#department = :department";
    queryParams.ExpressionAttributeNames = { "#department": "department" };
    queryParams.ExpressionAttributeValues = { ":department": userDepartment };
  } else if (accessControl.scope === "group") {
    // Show items accessible to user's groups
    const groupConditions = accessControl.allowedGroups.map(
      (group, index) => `contains(#allowedGroups, :group${index})`
    );

    queryParams.FilterExpression = groupConditions.join(" OR ");
    queryParams.ExpressionAttributeNames = {
      "#allowedGroups": "allowedGroups",
    };
    queryParams.ExpressionAttributeValues = {};

    accessControl.allowedGroups.forEach((group, index) => {
      queryParams.ExpressionAttributeValues[`:group${index}`] = group;
    });
  }

  const result = await dynamodb.scan(queryParams).promise();

  // Filter fields for each item
  const filteredItems = result.Items.map((item) =>
    filterItemFields(item, accessControl)
  );

  return createResponse(200, { items: filteredItems });
}

async function createData(data, userId, userGroups, userRole) {
  const { dataType } = data;

  const accessControl = getAccessControl(dataType, userGroups, userRole);

  if (!accessControl.canCreate) {
    throw new AccessDeniedError(
      "Insufficient permissions to create this type of data"
    );
  }

  // Validate and sanitize input data
  const sanitizedData = validateAndSanitizeData(data, accessControl);

  // Add system fields
  const item = {
    ...sanitizedData,
    id: generateUUID(),
    owner: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
  };

  await dynamodb
    .put({
      TableName: getTableName(dataType),
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
    .promise();

  return createResponse(201, {
    id: item.id,
    message: "Item created successfully",
  });
}

async function updateData(pathParameters, data, userId, userGroups, userRole) {
  const { dataType, itemId } = pathParameters;

  const accessControl = getAccessControl(dataType, userGroups, userRole);

  // Get existing item
  const existing = await dynamodb
    .get({
      TableName: getTableName(dataType),
      Key: { id: itemId },
    })
    .promise();

  if (!existing.Item) {
    return createResponse(404, { error: "Item not found" });
  }

  // Check update permissions
  if (!canUpdateItem(existing.Item, userId, accessControl)) {
    throw new AccessDeniedError("Insufficient permissions to update this item");
  }

  // Validate and sanitize update data
  const sanitizedData = validateAndSanitizeData(data, accessControl, true);

  // Build update expression
  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  for (const [key, value] of Object.entries(sanitizedData)) {
    if (accessControl.editableFields.includes(key)) {
      updateExpression.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  }

  // Add system fields
  updateExpression.push("#updatedAt = :updatedAt");
  updateExpression.push("#updatedBy = :updatedBy");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeNames["#updatedBy"] = "updatedBy";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();
  expressionAttributeValues[":updatedBy"] = userId;

  if (updateExpression.length === 2) {
    // Only system fields
    return createResponse(400, { error: "No valid fields to update" });
  }

  await dynamodb
    .update({
      TableName: getTableName(dataType),
      Key: { id: itemId },
      UpdateExpression: `SET ${updateExpression.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
    .promise();

  return createResponse(200, { message: "Item updated successfully" });
}

function getAccessControl(dataType, userGroups, userRole) {
  const accessControls = {
    users: {
      admin: {
        canCreate: true,
        canDelete: true,
        scope: "all",
        editableFields: ["status", "role", "permissions", "email"],
        visibleFields: [
          "id",
          "email",
          "status",
          "role",
          "createdAt",
          "lastLogin",
        ],
      },
      moderator: {
        canCreate: false,
        canDelete: false,
        scope: "department",
        editableFields: ["status"],
        visibleFields: ["id", "email", "status", "createdAt"],
      },
      user: {
        canCreate: false,
        canDelete: false,
        scope: "owner",
        editableFields: ["email", "preferences"],
        visibleFields: ["id", "email", "preferences", "createdAt"],
      },
    },
    documents: {
      admin: {
        canCreate: true,
        canDelete: true,
        scope: "all",
        editableFields: ["title", "content", "status", "category"],
        visibleFields: [
          "id",
          "title",
          "content",
          "status",
          "category",
          "owner",
          "createdAt",
        ],
      },
      moderator: {
        canCreate: true,
        canDelete: false,
        scope: "group",
        allowedGroups: ["Moderators", "Admins"],
        editableFields: ["title", "content", "status"],
        visibleFields: [
          "id",
          "title",
          "content",
          "status",
          "owner",
          "createdAt",
        ],
      },
      user: {
        canCreate: true,
        canDelete: false,
        scope: "owner",
        editableFields: ["title", "content"],
        visibleFields: ["id", "title", "content", "status", "createdAt"],
      },
    },
  };

  // Determine user's highest role
  let effectiveRole = "user";
  if (userGroups.includes("Admins")) {
    effectiveRole = "admin";
  } else if (userGroups.includes("Moderators")) {
    effectiveRole = "moderator";
  }

  return (
    accessControls[dataType]?.[effectiveRole] || accessControls[dataType]?.user
  );
}

function canAccessItem(item, userId, accessControl) {
  switch (accessControl.scope) {
    case "all":
      return true;
    case "owner":
      return item.owner === userId;
    case "department":
      // Would need to implement department checking
      return true; // Simplified for example
    case "group":
      return (
        item.allowedGroups &&
        accessControl.allowedGroups.some((group) =>
          item.allowedGroups.includes(group)
        )
      );
    default:
      return false;
  }
}

function canUpdateItem(item, userId, accessControl) {
  if (!accessControl.canUpdate && accessControl.scope !== "owner") {
    return false;
  }

  return canAccessItem(item, userId, accessControl);
}

function filterItemFields(item, accessControl) {
  if (!accessControl.visibleFields) {
    return item;
  }

  const filtered = {};
  for (const field of accessControl.visibleFields) {
    if (item.hasOwnProperty(field)) {
      filtered[field] = item[field];
    }
  }

  return filtered;
}

class AccessDeniedError extends Error {
  constructor(message) {
    super(message);
    this.name = "AccessDeniedError";
  }
}

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}
```

## Environment Variables and Secrets Management

### Lambda Environment Variables

```javascript
// Secure configuration management
const getConfig = () => {
  return {
    userPoolId: process.env.USER_POOL_ID,
    userPoolClientId: process.env.USER_POOL_CLIENT_ID,
    identityPoolId: process.env.IDENTITY_POOL_ID,
    region: process.env.AWS_REGION,

    // Database configuration
    userProfilesTable: process.env.USER_PROFILES_TABLE,
    fileMetadataTable: process.env.FILE_METADATA_TABLE,
    userQuotasTable: process.env.USER_QUOTAS_TABLE,

    // Storage configuration
    storageBucket: process.env.STORAGE_BUCKET,
    quarantineBucket: process.env.QUARANTINE_BUCKET,

    // External service configuration
    emailServiceEndpoint: process.env.EMAIL_SERVICE_ENDPOINT,
    virusScanApiKey: process.env.VIRUS_SCAN_API_KEY, // From AWS Secrets Manager

    // Security settings
    jwtSecret: process.env.JWT_SECRET, // From AWS Secrets Manager
    encryptionKey: process.env.ENCRYPTION_KEY, // From AWS Secrets Manager

    // Feature flags
    enableVirusScanning: process.env.ENABLE_VIRUS_SCANNING === "true",
    enableThumbnailGeneration:
      process.env.ENABLE_THUMBNAIL_GENERATION === "true",
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024,
  };
};

// AWS Secrets Manager integration
const AWS = require("aws-sdk");
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  try {
    const result = await secretsManager
      .getSecretValue({
        SecretId: secretName,
      })
      .promise();

    return JSON.parse(result.SecretString);
  } catch (error) {
    console.error(`Error retrieving secret ${secretName}:`, error);
    throw error;
  }
}

// Usage in Lambda function
exports.handler = async (event) => {
  const config = getConfig();

  // Get sensitive configuration from Secrets Manager
  const dbCredentials = await getSecret("rds-credentials");
  const apiKeys = await getSecret("external-api-keys");

  // Use configuration securely
  // ...
};
```
