const pool = require("../config/db");

async function upsertProviderFromPayload(payload) {
  const providerId =
    payload.kenya_provider_id ||
    payload.provider_id ||
    payload.provider?.provider_id ||
    payload.provider?.kenya_provider_id;

  if (!providerId) return null;

  const providerName = payload.provider_name || payload.provider?.provider_name || "";
  const providerType = payload.provider_type || payload.provider?.provider_type || "";
  const county = payload.county || payload.provider?.county || "";
  const providerMobile = payload.provider_mobile || payload.provider?.provider_mobile || "";
  const providerEmail =
    payload.provider_email ||
    payload.claims_email ||
    payload.provider?.provider_email ||
    payload.provider?.claims_email ||
    "";
  const claimsEmail =
    payload.claims_email ||
    payload.provider_email ||
    payload.provider?.claims_email ||
    payload.provider?.provider_email ||
    "";
  const billingEmail = payload.billing_email || payload.provider?.billing_email || "";
  const kraPin = payload.kra_pin || payload.provider_kra_pin || payload.provider?.kra_pin || "";
  const facilityLicenseNo =
    payload.facility_license_no || payload.provider?.facility_license_no || "";

  await pool.query(
    `
    INSERT INTO providers (
      provider_id,
      provider_name,
      provider_type,
      county,
      provider_mobile,
      provider_email,
      kra_pin,
      facility_license_no,
      source_system,
      last_seen_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SMART_LCT', NOW())
    ON DUPLICATE KEY UPDATE
      provider_name = VALUES(provider_name),
      provider_type = VALUES(provider_type),
      county = VALUES(county),
      provider_mobile = VALUES(provider_mobile),
      provider_email = VALUES(provider_email),
      kra_pin = VALUES(kra_pin),
      facility_license_no = VALUES(facility_license_no),
      source_system = 'SMART_LCT',
      last_seen_at = NOW(),
      updated_at = NOW()
    `,
    [
      providerId,
      providerName,
      providerType,
      county,
      providerMobile,
      providerEmail,
      kraPin,
      facilityLicenseNo,
    ]
  );

  if (claimsEmail) {
    await pool.query(
      `
      INSERT INTO provider_contacts (
        provider_id,
        contact_type,
        email,
        phone,
        is_primary,
        is_active
      )
      VALUES (?, 'claims', ?, ?, TRUE, TRUE)
      ON DUPLICATE KEY UPDATE
        phone = VALUES(phone),
        is_primary = TRUE,
        is_active = TRUE,
        updated_at = NOW()
      `,
      [providerId, claimsEmail, providerMobile]
    );
  }

  if (billingEmail) {
    await pool.query(
      `
      INSERT INTO provider_contacts (
        provider_id,
        contact_type,
        email,
        phone,
        is_primary,
        is_active
      )
      VALUES (?, 'billing', ?, ?, FALSE, TRUE)
      ON DUPLICATE KEY UPDATE
        phone = VALUES(phone),
        is_active = TRUE,
        updated_at = NOW()
      `,
      [providerId, billingEmail, providerMobile]
    );
  }

  return providerId;
}

module.exports = {
  upsertProviderFromPayload,
};
