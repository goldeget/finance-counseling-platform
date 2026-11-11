export const removePhraseSql = "UPDATE reviews SET content = TRIM(REPLACE(content, ?, '')) WHERE id IN (SELECT id FROM reviews WHERE instr(content, ?) > 0 LIMIT 250)";
export const targetPhrase = '진심으로 깊은 감사의 말씀을 전합니다!';
