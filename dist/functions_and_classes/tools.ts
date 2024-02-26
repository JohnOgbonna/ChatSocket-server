export function getCurrentDateTime(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  return formattedDateTime;
}

export function timeValid(dateTime: string | Date): boolean {
  const targetDateTime = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  const currentDateTime = new Date();

  return targetDateTime > currentDateTime;
}