# API Permissions & Authorization

## GraphQL API Authorization Rules

### Owner-Based Authorization

```graphql
# Users can only access their own posts
type Post @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  title: String! @auth(rules: [{ allow: owner }])
  content: String! @auth(rules: [{ allow: owner }])
  published: Boolean
    @auth(rules: [{ allow: owner }, { allow: public, operations: [read] }])
  owner: String
}
```

### Group-Based Authorization

```graphql
# Admin-only access to sensitive data
type AdminData @model @auth(rules: [{ allow: groups, groups: ["Admins"] }]) {
  id: ID!
  sensitiveInfo: String!
  systemLogs: [String]
  userMetrics: AWSJSON
}

# Multi-group access with different permissions
type Document
  @model
  @auth(
    rules: [
      {
        allow: groups
        groups: ["Admins"]
        operations: [create, read, update, delete]
      }
      { allow: groups, groups: ["Moderators"], operations: [read, update] }
      { allow: groups, groups: ["Users"], operations: [read] }
    ]
  ) {
  id: ID!
  title: String!
  content: String!
  status: DocumentStatus!
  createdBy: String
}

enum DocumentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### Dynamic Group Authorization

```graphql
# Access based on user's department
type DepartmentData
  @model
  @auth(rules: [{ allow: groups, groupsField: "departments" }]) {
  id: ID!
  departments: [String] # User must belong to one of these departments
  data: String!
  confidential: Boolean
}
```

### Field-Level Authorization

```graphql
type UserProfile
  @model
  @auth(rules: [{ allow: owner }, { allow: groups, groups: ["Admins"] }]) {
  id: ID!
  username: String!
  email: String!
    @auth(rules: [{ allow: owner }, { allow: groups, groups: ["Admins"] }])
  # Personal info only visible to owner and admins
  personalInfo: PersonalInfo
    @auth(rules: [{ allow: owner }, { allow: groups, groups: ["Admins"] }])
  # Public profile info
  bio: String @auth(rules: [{ allow: public, operations: [read] }])
  avatar: String @auth(rules: [{ allow: public, operations: [read] }])
  # Admin-only fields
  accountStatus: String @auth(rules: [{ allow: groups, groups: ["Admins"] }])
  lastLogin: AWSDateTime @auth(rules: [{ allow: groups, groups: ["Admins"] }])
}

type PersonalInfo {
  firstName: String!
  lastName: String!
  phone: String
  address: Address
}

type Address {
  street: String
  city: String
  state: String
  zipCode: String
}
```

### Multi-Auth Strategy

```graphql
# Supports both API Key and Cognito User Pool authentication
type PublicPost
  @model
  @auth(
    rules: [
      { allow: public, provider: apiKey, operations: [read] }
      {
        allow: owner
        provider: userPools
        operations: [create, update, delete]
      }
      {
        allow: groups
        groups: ["Moderators"]
        provider: userPools
        operations: [update, delete]
      }
    ]
  ) {
  id: ID!
  title: String!
  content: String!
  author: String
  published: Boolean
  moderationStatus: ModerationStatus
}

enum ModerationStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### Custom Lambda Authorization

```graphql
# Uses custom Lambda function for authorization
type CustomAuthData
  @model
  @auth(rules: [{ allow: custom, provider: function }]) {
  id: ID!
  sensitiveData: String!
  customField: String
}
```

#### Lambda Authorizer Function

```javascript
exports.handler = async (event) => {
  const { authorizationToken, requestContext } = event;

  try {
    // Custom authorization logic
    const decodedToken = verifyCustomToken(authorizationToken);
    const userId = decodedToken.sub;
    const userRole = decodedToken.role;

    // Check if user has permission for the requested operation
    const { operation, field } = requestContext;

    if (operation === "Query" && field === "listCustomAuthData") {
      // Only allow admins to list all data
      if (userRole !== "admin") {
        throw new Error("Unauthorized");
      }
    }

    return {
      isAuthorized: true,
      resolverContext: {
        userId,
        userRole,
      },
    };
  } catch (error) {
    return {
      isAuthorized: false,
      errorMessage: error.message,
    };
  }
};

function verifyCustomToken(token) {
  // Implement your custom token verification logic
  // This could involve JWT verification, database lookup, etc.
  return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
}
```

## REST API Authorization

### API Gateway Configuration

```yaml
# amplify/backend/api/restapi/restapi-cloudformation-template.json
Resources:
  RestApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: !Sub "${AWS::StackName}-restapi"

  # Public endpoint (no auth required)
  PublicResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref RestApi
      ParentId: !GetAtt RestApi.RootResourceId
      PathPart: public

  PublicMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref RestApi
      ResourceId: !Ref PublicResource
      HttpMethod: GET
      AuthorizationType: NONE

  # Private endpoint (Cognito auth required)
  PrivateResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref RestApi
      ParentId: !GetAtt RestApi.RootResourceId
      PathPart: private

  PrivateMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref RestApi
      ResourceId: !Ref PrivateResource
      HttpMethod: GET
      AuthorizationType: AWS_IAM

  # Admin endpoint (custom authorizer)
  AdminResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref RestApi
      ParentId: !GetAtt RestApi.RootResourceId
      PathPart: admin

  AdminMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref RestApi
      ResourceId: !Ref AdminResource
      HttpMethod: POST
      AuthorizationType: CUSTOM
      AuthorizerId: !Ref CustomAuthorizer
```

### Custom API Gateway Authorizer

```javascript
// Lambda function for custom authorization
exports.handler = async (event) => {
  const token = event.authorizationToken;
  const methodArn = event.methodArn;

  try {
    // Validate the token (JWT, database lookup, etc.)
    const user = await validateToken(token);

    if (!user) {
      throw new Error("Unauthorized");
    }

    // Generate IAM policy
    const policy = generatePolicy(user.id, "Allow", methodArn, user);

    return policy;
  } catch (error) {
    throw new Error("Unauthorized");
  }
};

function generatePolicy(principalId, effect, resource, user) {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: {
      userId: user.id,
      userRole: user.role,
      department: user.department,
    },
  };
}

async function validateToken(token) {
  // Implement token validation logic
  // Could use JWT verification, Cognito token validation, etc.

  // Example with Cognito
  const cognito = new AWS.CognitoIdentityServiceProvider();

  try {
    const result = await cognito
      .getUser({
        AccessToken: token,
      })
      .promise();

    return {
      id: result.UserAttributes.find((attr) => attr.Name === "sub").Value,
      email: result.UserAttributes.find((attr) => attr.Name === "email").Value,
      role:
        result.UserAttributes.find((attr) => attr.Name === "custom:role")
          ?.Value || "user",
    };
  } catch (error) {
    return null;
  }
}
```

## Resource-Based Policies

### DynamoDB Resource Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowOwnerAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:role/COGNITO-ROLE"
      },
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:REGION:ACCOUNT:table/TABLE-NAME",
      "Condition": {
        "ForAllValues:StringEquals": {
          "dynamodb:LeadingKeys": "${cognito-identity.amazonaws.com:sub}"
        }
      }
    },
    {
      "Sid": "AllowAdminAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:role/ADMIN-ROLE"
      },
      "Action": "dynamodb:*",
      "Resource": "arn:aws:dynamodb:REGION:ACCOUNT:table/TABLE-NAME"
    }
  ]
}
```

## VTL (Velocity Template Language) Resolvers

### Owner-based filtering resolver

```vtl
## Query.listPosts.req.vtl
{
  "version": "2017-02-28",
  "operation": "Query",
  "query": {
    "expression": "#owner = :owner",
    "expressionNames": {
      "#owner": "owner"
    },
    "expressionValues": {
      ":owner": {
        "S": "$context.identity.sub"
      }
    }
  }
}
```

### Group-based authorization resolver

```vtl
## Mutation.createAdminData.req.vtl
#if(!$util.authType.equals("User Pool Authorization"))
  $util.unauthorized()
#end

#set($userGroups = $context.identity.claims.get("cognito:groups"))
#set($allowedGroups = ["Admins"])
#set($hasPermission = false)

#foreach($group in $userGroups)
  #if($allowedGroups.contains($group))
    #set($hasPermission = true)
    #break
  #end
#end

#if(!$hasPermission)
  $util.unauthorized()
#end

{
  "version": "2017-02-28",
  "operation": "PutItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($util.autoId())
  },
  "attributeValues": $util.dynamodb.toMapValuesJson($context.arguments.input)
}
```

## Client-Side Implementation

### React Component with Authorization

```javascript
import { useAuthenticator } from "@aws-amplify/ui-react";
import { API, Auth } from "aws-amplify";

function ProtectedComponent() {
  const { user } = useAuthenticator((context) => [context.user]);
  const [userGroups, setUserGroups] = useState([]);

  useEffect(() => {
    if (user) {
      // Get user groups from token
      const groups =
        user.signInUserSession.accessToken.payload["cognito:groups"] || [];
      setUserGroups(groups);
    }
  }, [user]);

  const isAdmin = userGroups.includes("Admins");
  const isModerator = userGroups.includes("Moderators");

  const handleAdminAction = async () => {
    if (!isAdmin) {
      alert("Insufficient permissions");
      return;
    }

    try {
      await API.graphql({
        query: adminOnlyMutation,
        variables: { input: {} },
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <h2>Protected Content</h2>
      {isAdmin && <button onClick={handleAdminAction}>Admin Action</button>}
      {isModerator && <div>Moderator Panel</div>}
    </div>
  );
}
```
