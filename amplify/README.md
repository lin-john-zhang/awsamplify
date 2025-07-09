# Amplify Backend Configuration Examples

This directory contains comprehensive examples of AWS Amplify backend configurations with various permission setups.

## Directory Structure

```
amplify/
├── backend/
│   ├── auth/
│   │   └── amplifyPermissionsAuth/
│   │       ├── cli-inputs.json
│   │       ├── parameters.json
│   │       └── amplifyPermissionsAuth-cloudformation-template.yml
│   ├── api/
│   │   └── amplifyPermissionsApi/
│   │       ├── cli-inputs.json
│   │       ├── parameters.json
│   │       ├── schema.graphql
│   │       ├── resolvers/
│   │       └── amplifyPermissionsApi-cloudformation-template.json
│   ├── storage/
│   │   └── amplifyPermissionsStorage/
│   │       ├── cli-inputs.json
│   │       ├── parameters.json
│   │       └── amplifyPermissionsStorage-cloudformation-template.json
│   └── function/
│       ├── amplifyPermissionsFunction/
│       └── adminFunction/
├── cli.json
└── team-provider-info.json
```

## Configuration Files

### CLI Configuration

```json
{
  "features": {
    "graphqltransformer": {
      "addmissingownerfields": true,
      "improvepluralization": false,
      "validatetypenamereservedwords": true,
      "useexperimentalpipelinedtransformer": true,
      "enableiterativegsiupdates": true,
      "secondarykeyasgsi": true,
      "skipoverridemutationinputtypes": true,
      "transformerversion": 2,
      "suppressschemamigrationprompt": true,
      "securityenhancementnotification": false,
      "showfieldauthnotification": false,
      "usesubusernamefordefaultidentityclaim": true,
      "usefieldnameforprimarykeyconnectionfield": false,
      "enableautoindexquerynames": false,
      "respectprimarykeyattributesonconnectionfield": true,
      "shoulddeepmergedirectiveconfigs": false,
      "populateownerfieldforstaticgroupauth": true
    },
    "frontend-ios": {
      "enablexcodeintegration": true
    },
    "auth": {
      "enablecaseinsensitivity": true,
      "useinclusiveterminology": true,
      "breakcirculardependency": true,
      "forcealiasattributes": false,
      "useenabledmfas": true
    },
    "codegen": {
      "useappsyncmodelgenplugin": true,
      "usedocsgeneratorplugin": true,
      "usetypesgeneratorplugin": true,
      "cleangeneratedmodelsdirectory": true,
      "retaincasestyle": true,
      "addtimestampfields": true,
      "handlelistnullabilitytransparently": true,
      "emitauthprovider": true,
      "generateindexrules": true,
      "enabledartnullsafety": true,
      "generatemodelsforlazyloadandcustomselectionset": false
    },
    "appsync": {
      "generategraphqlpermissions": true
    },
    "latestregionsupport": {
      "pinpoint": 1,
      "translate": 1,
      "transcribe": 1,
      "comprehend": 1,
      "rekognition": 1,
      "textract": 1,
      "polly": 1
    },
    "project": {
      "overrides": true
    }
  },
  "debug": {
    "shareProjectConfig": false
  }
}
```

### Team Provider Information

```json
{
  "dev": {
    "awscloudformation": {
      "AuthRoleName": "amplify-permissions-demo-dev-authRole",
      "UnauthRoleName": "amplify-permissions-demo-dev-unauthRole",
      "AuthRoleArn": "arn:aws:iam::ACCOUNT:role/amplify-permissions-demo-dev-authRole",
      "UnauthRoleArn": "arn:aws:iam::ACCOUNT:role/amplify-permissions-demo-dev-unauthRole",
      "DeploymentBucketName": "amplify-permissions-demo-dev-deployment",
      "UnauthRolePolicy": "amplify-permissions-demo-dev-unauthRole-policy",
      "StackName": "amplify-permissions-demo-dev",
      "StackId": "arn:aws:cloudformation:us-east-1:ACCOUNT:stack/amplify-permissions-demo-dev/UUID",
      "AmplifyAppId": "d1234567890123",
      "APIGatewayAuthURL": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX"
    },
    "categories": {
      "auth": {
        "amplifyPermissionsAuth": {
          "userPoolId": "us-east-1_XXXXXXXXX",
          "userPoolClientId": "XXXXXXXXXXXXXXXXXXXXXXXXXX",
          "identityPoolId": "us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          "userPoolWebClientId": "XXXXXXXXXXXXXXXXXXXXXXXXXX",
          "adminQueries": {
            "userPoolId": "us-east-1_XXXXXXXXX",
            "apiName": "AdminQueries",
            "requestSigningRegion": "us-east-1"
          }
        }
      },
      "api": {
        "amplifyPermissionsApi": {
          "GraphQLAPIIdOutput": "abcdefghijklmnopqrstuvwxyz",
          "GraphQLAPIEndpointOutput": "https://abcdefghijklmnopqrstuvwxyz.appsync-api.us-east-1.amazonaws.com/graphql"
        }
      },
      "storage": {
        "amplifyPermissionsStorage": {
          "BucketName": "amplify-permissions-demo-dev-storage-bucket",
          "Region": "us-east-1"
        }
      },
      "function": {
        "amplifyPermissionsFunction": {
          "deploymentBucketName": "amplify-permissions-demo-dev-deployment",
          "s3Key": "amplify-builds/amplifyPermissionsFunction-BUILD_ID-build.zip"
        }
      }
    }
  },
  "prod": {
    "awscloudformation": {
      "AuthRoleName": "amplify-permissions-demo-prod-authRole",
      "UnauthRoleName": "amplify-permissions-demo-prod-unauthRole",
      "AuthRoleArn": "arn:aws:iam::ACCOUNT:role/amplify-permissions-demo-prod-authRole",
      "UnauthRoleArn": "arn:aws:iam::ACCOUNT:role/amplify-permissions-demo-prod-unauthRole",
      "DeploymentBucketName": "amplify-permissions-demo-prod-deployment",
      "UnauthRolePolicy": "amplify-permissions-demo-prod-unauthRole-policy",
      "StackName": "amplify-permissions-demo-prod",
      "StackId": "arn:aws:cloudformation:us-east-1:ACCOUNT:stack/amplify-permissions-demo-prod/UUID",
      "AmplifyAppId": "d1234567890123"
    },
    "categories": {
      "auth": {
        "amplifyPermissionsAuth": {
          "userPoolId": "us-east-1_YYYYYYYYY",
          "userPoolClientId": "YYYYYYYYYYYYYYYYYYYYYYYYYY",
          "identityPoolId": "us-east-1:yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
          "userPoolWebClientId": "YYYYYYYYYYYYYYYYYYYYYYYYYY"
        }
      }
    }
  }
}
```
