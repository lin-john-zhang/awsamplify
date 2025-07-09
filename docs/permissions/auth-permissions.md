# Authentication & Authorization Permissions

## Cognito User Pool Configuration

### Basic Authentication Setup

```json
{
  "userPoolName": "amplify-permissions-demo",
  "autoVerifiedAttributes": ["email"],
  "mfaConfiguration": "OPTIONAL",
  "mfaTypes": ["SMS", "TOTP"],
  "smsAuthenticationMessage": "Your authentication code is {####}",
  "smsVerificationMessage": "Your verification code is {####}",
  "emailVerificationSubject": "Your verification code",
  "emailVerificationMessage": "Your verification code is {####}",
  "passwordPolicy": {
    "minimumLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSymbols": true
  },
  "usernameAttributes": ["email"],
  "userPoolGroups": [
    {
      "groupName": "Admins",
      "description": "Administrator group with elevated permissions",
      "precedence": 1
    },
    {
      "groupName": "Users",
      "description": "Standard user group",
      "precedence": 2
    },
    {
      "groupName": "Moderators",
      "description": "Content moderation group",
      "precedence": 3
    }
  ]
}
```

### Advanced Authentication Features

#### Custom User Attributes

```json
{
  "customAttributes": [
    {
      "attributeDataType": "String",
      "name": "department",
      "required": false,
      "mutable": true
    },
    {
      "attributeDataType": "String",
      "name": "role",
      "required": false,
      "mutable": true
    },
    {
      "attributeDataType": "Number",
      "name": "access_level",
      "required": false,
      "mutable": true
    }
  ]
}
```

#### Pre-Authentication Lambda Trigger

```javascript
exports.handler = async (event) => {
  // Custom authentication logic
  const { userAttributes } = event.request;

  // Check if user belongs to allowed domain
  const email = userAttributes.email;
  const allowedDomains = ["company.com", "partner.com"];
  const emailDomain = email.split("@")[1];

  if (!allowedDomains.includes(emailDomain)) {
    throw new Error("Email domain not allowed");
  }

  // Auto-assign user to appropriate group based on email domain
  if (emailDomain === "company.com") {
    event.response.groupConfiguration = {
      groupsToOverride: ["Users"],
      iamRolesToOverride: [],
      preferredRole: "",
    };
  }

  return event;
};
```

## Identity Pool Configuration

### Federated Identity Setup

```json
{
  "identityPoolName": "amplify_permissions_demo_identitypool",
  "allowUnauthenticatedIdentities": false,
  "authenticationProviders": {
    "cognito": {
      "userPoolId": "us-east-1_XXXXXXXXX",
      "userPoolClientId": "XXXXXXXXXXXXXXXXXXXXXXXXXX"
    },
    "google": {
      "webClientId": "XXXXXXXXXX.apps.googleusercontent.com"
    },
    "facebook": {
      "appId": "XXXXXXXXXXXXXXXXX"
    }
  },
  "roleMappings": {
    "cognito": {
      "type": "Rules",
      "ambiguousRoleResolution": "AuthenticatedRole",
      "rulesConfiguration": {
        "rules": [
          {
            "claim": "cognito:groups",
            "matchType": "Contains",
            "value": "Admins",
            "roleArn": "arn:aws:iam::ACCOUNT:role/AdminRole"
          },
          {
            "claim": "cognito:groups",
            "matchType": "Contains",
            "value": "Users",
            "roleArn": "arn:aws:iam::ACCOUNT:role/UserRole"
          }
        ]
      }
    }
  }
}
```

### IAM Roles for Identity Pool

#### Authenticated User Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "mobileanalytics:PutEvents",
        "cognito-sync:*",
        "cognito-identity:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET/public/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET/protected/${cognito-identity.amazonaws.com:sub}/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET/private/${cognito-identity.amazonaws.com:sub}/*"
    }
  ]
}
```

#### Admin Role (Enhanced Permissions)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::YOUR-BUCKET", "arn:aws:s3:::YOUR-BUCKET/*"]
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:*"],
      "Resource": "arn:aws:dynamodb:*:*:table/YOUR-TABLE*"
    },
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": "arn:aws:lambda:*:*:function:YOUR-FUNCTION*"
    }
  ]
}
```

## Multi-Factor Authentication (MFA)

### TOTP Setup

```javascript
import { Auth } from "aws-amplify";

// Enable TOTP for user
async function setupTOTP() {
  try {
    const user = await Auth.currentAuthenticatedUser();
    const totpCode = await Auth.setupTOTP(user);

    // Display QR code to user
    const qrCodeUrl = `otpauth://totp/AWSCognito:${user.username}?secret=${totpCode}&issuer=AWSCognito`;

    return qrCodeUrl;
  } catch (error) {
    console.error("Error setting up TOTP:", error);
  }
}

// Verify TOTP token
async function verifyTOTP(token) {
  try {
    const user = await Auth.currentAuthenticatedUser();
    await Auth.verifyTotpToken(user, token);
    await Auth.setPreferredMFA(user, "TOTP");

    console.log("TOTP verified and set as preferred MFA");
  } catch (error) {
    console.error("Error verifying TOTP:", error);
  }
}
```

### SMS MFA Configuration

```json
{
  "smsConfiguration": {
    "snsCallerArn": "arn:aws:iam::ACCOUNT:role/service-role/CognitoSNSRole",
    "externalId": "unique-external-id"
  },
  "mfaConfiguration": "ON",
  "smsMfaConfiguration": {
    "smsAuthenticationMessage": "Your MFA code is {####}",
    "smsConfiguration": {
      "snsCallerArn": "arn:aws:iam::ACCOUNT:role/service-role/CognitoSNSRole"
    }
  }
}
```

## Custom Authentication Flows

### Challenge-Response Authentication

```javascript
exports.handler = async (event) => {
  if (event.request.challengeName === "CUSTOM_CHALLENGE") {
    // Generate custom challenge (e.g., security questions)
    event.response.publicChallengeParameters = {
      question: "What is your favorite color?",
    };
    event.response.privateChallengeParameters = {
      answer: "blue", // This would typically come from user profile
    };
    event.response.challengeMetadata = "CUSTOM_CHALLENGE";
  }

  return event;
};
```

### Post-Authentication Actions

```javascript
exports.handler = async (event) => {
  // Log successful authentication
  console.log("User authenticated:", event.request.userAttributes.email);

  // Update last login timestamp
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  await dynamodb
    .update({
      TableName: "UserProfiles",
      Key: { userId: event.request.userAttributes.sub },
      UpdateExpression: "SET lastLogin = :timestamp",
      ExpressionAttributeValues: {
        ":timestamp": new Date().toISOString(),
      },
    })
    .promise();

  return event;
};
```
