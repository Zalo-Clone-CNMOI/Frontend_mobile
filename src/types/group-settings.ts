export interface GroupPermissions {
  change_info: boolean;
  pin_message: boolean;
  create_note: boolean;
  create_poll: boolean;
  send_message: boolean;
}

export interface GroupPolicies {
  join_approval: boolean;
  allow_read_history: boolean;
  allow_join_link: boolean;
}

export interface GroupFeatures {
  admin_tagging: boolean;
}

export interface GroupSettings {
  permissions: GroupPermissions;
  policies: GroupPolicies;
  features: GroupFeatures;
}

export interface UpdatePermissionsDto {
  change_info?: boolean;
  pin_message?: boolean;
  create_note?: boolean;
  create_poll?: boolean;
  send_message?: boolean;
}

export interface UpdatePoliciesDto {
  join_approval?: boolean;
  allow_read_history?: boolean;
  allow_join_link?: boolean;
}

export interface UpdateFeaturesDto {
  admin_tagging?: boolean;
}

export interface UpdateGroupSettingsDto {
  permissions?: UpdatePermissionsDto;
  policies?: UpdatePoliciesDto;
  features?: UpdateFeaturesDto;
}

export type GroupPermissionKey = keyof GroupPermissions;
export type GroupPolicyKey = keyof GroupPolicies;
export type GroupFeatureKey = keyof GroupFeatures;

export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  permissions: {
    change_info: true,
    pin_message: true,
    create_note: true,
    create_poll: true,
    send_message: true,
  },
  policies: {
    join_approval: false,
    allow_read_history: true,
    allow_join_link: true,
  },
  features: {
    admin_tagging: true,
  },
};

export type MemberRole = 'owner' | 'admin' | 'member';

export function canMemberDo(
  action: GroupPermissionKey,
  role: MemberRole,
  settings: GroupSettings | null | undefined,
): boolean {
  if (role === 'owner' || role === 'admin') {
    return true;
  }

  if (!settings) {
    return true;
  }

  return settings.permissions[action] ?? true;
}