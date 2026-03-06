/**
 * Permite usuario_id NULL e ON DELETE SET NULL em acionamentos e aguas_guariroba,
 * para que o admin possa excluir usuário mesmo com histórico (registros ficam sem vínculo).
 * Rode da pasta backend: node scripts/alter-usuario-id-set-null.js
 */
import 'dotenv/config'
import { query } from '../db.js'

async function run(sql, params = []) {
  const r = await query(sql, params)
  return r
}

async function main() {
  try {
    await run('ALTER TABLE acionamentos MODIFY usuario_id INT NULL')
    console.log('acionamentos.usuario_id: permitido NULL')
  } catch (e) {
    if (e.code !== 'ER_NO_SUCH_TABLE' && e.errno !== 1146) console.error('acionamentos:', e.message)
  }

  try {
    await run('ALTER TABLE acionamentos DROP FOREIGN KEY fk_acionamentos_usuario')
    await run(
      'ALTER TABLE acionamentos ADD CONSTRAINT fk_acionamentos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL'
    )
    console.log('acionamentos: FK alterada para ON DELETE SET NULL')
  } catch (e) {
    if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') console.log('acionamentos: FK já alterada ou nome diferente')
    else if (e.code !== 'ER_NO_SUCH_TABLE') console.error('acionamentos FK:', e.message)
  }

  try {
    await run('ALTER TABLE aguas_guariroba MODIFY usuario_id INT NULL')
    console.log('aguas_guariroba.usuario_id: permitido NULL')
  } catch (e) {
    if (e.code !== 'ER_NO_SUCH_TABLE' && e.errno !== 1146) console.error('aguas_guariroba:', e.message)
  }

  try {
    await run('ALTER TABLE aguas_guariroba DROP FOREIGN KEY fk_aguas_guariroba_usuario')
    await run(
      'ALTER TABLE aguas_guariroba ADD CONSTRAINT fk_aguas_guariroba_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL'
    )
    console.log('aguas_guariroba: FK alterada para ON DELETE SET NULL')
  } catch (e) {
    if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') console.log('aguas_guariroba: FK já alterada ou nome diferente')
    else if (e.code !== 'ER_NO_SUCH_TABLE') console.error('aguas_guariroba FK:', e.message)
  }

  console.log('Concluído.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
