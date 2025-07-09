import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource with comprehensive permissions setup
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  multifactor: {
    mode: 'OPTIONAL',
    totp: true,
    sms: true
  },
  userAttributes: {
    'custom:department': {
      dataType: 'String',
      mutable: true
    },
    'custom:role': {
      dataType: 'String', 
      mutable: true
    },
    'custom:team_id': {
      dataType: 'String',
      mutable: true
    },
    'custom:access_level': {
      dataType: 'Number',
      mutable: true
    }
  },
  groups: ['Admins', 'Moderators', 'Users']
});
