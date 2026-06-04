export function normalizePhone(phone: string): string {
  let mobile = phone.trim().replace(/\s+/g, '');

  if (/^\d{10}$/.test(mobile)) {
    mobile = `+91${mobile}`;
  } else if (/^91\d{10}$/.test(mobile)) {
    mobile = `+${mobile}`;
  }

  return mobile;
}