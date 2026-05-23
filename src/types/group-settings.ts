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

const booleanOrDefault = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

export function normalizeGroupSettings(settings: Partial<GroupSettings> | null | undefined): GroupSettings {
  return {
    permissions: {
      change_info: booleanOrDefault(settings?.permissions?.change_info, DEFAULT_GROUP_SETTINGS.permissions.change_info),
      pin_message: booleanOrDefault(settings?.permissions?.pin_message, DEFAULT_GROUP_SETTINGS.permissions.pin_message),
      create_note: booleanOrDefault(settings?.permissions?.create_note, DEFAULT_GROUP_SETTINGS.permissions.create_note),
      create_poll: booleanOrDefault(settings?.permissions?.create_poll, DEFAULT_GROUP_SETTINGS.permissions.create_poll),
      send_message: booleanOrDefault(settings?.permissions?.send_message, DEFAULT_GROUP_SETTINGS.permissions.send_message),
    },
    policies: {
      join_approval: booleanOrDefault(settings?.policies?.join_approval, DEFAULT_GROUP_SETTINGS.policies.join_approval),
      allow_read_history: booleanOrDefault(settings?.policies?.allow_read_history, DEFAULT_GROUP_SETTINGS.policies.allow_read_history),
      allow_join_link: booleanOrDefault(settings?.policies?.allow_join_link, DEFAULT_GROUP_SETTINGS.policies.allow_join_link),
    },
    features: {
      admin_tagging: booleanOrDefault(settings?.features?.admin_tagging, DEFAULT_GROUP_SETTINGS.features.admin_tagging),
    },
  };
}

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
    return false;
  }

  return normalizeGroupSettings(settings).permissions[action] ?? true;
}
