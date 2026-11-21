export function gtinOk(code: string) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop();
  const checksum = digits
    .reverse()
    .reduce((sum, digit, index) => sum + digit * (index % 2 ? 1 : 3), 0);
  return (10 - (checksum % 10)) % 10 === check;
}
