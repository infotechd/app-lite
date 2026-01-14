/**
 * Script de Migração: Remoção do campo 'tipo' de todos os usuários
 *
 * Execução: npx ts-node scripts/migration-remove-tipo.ts
 *
 * ATENÇÃO: Execute em ambiente de staging antes de produção.
 * Faça backup do banco de dados antes de executar.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI não definida nas variáveis de ambiente');
  }

  console.log('🔄 Conectando ao MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado com sucesso');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  console.log('🔄 Iniciando migração...');

  // Contar documentos afetados
  const countBefore = await usersCollection.countDocuments({ tipo: { $exists: true } });
  console.log(`📊 Documentos com campo 'tipo': ${countBefore}`);

  // Remover o campo 'tipo' de todos os documentos
  const result = await usersCollection.updateMany(
    {}, // Todos os documentos
    { $unset: { tipo: '' } } // Remove o campo 'tipo'
  );

  console.log(`✅ Migração concluída!`);
  console.log(`   - Documentos modificados: ${result.modifiedCount}`);
  console.log(`   - Documentos correspondidos: ${result.matchedCount}`);

  // Verificação pós-migração
  const countAfter = await usersCollection.countDocuments({ tipo: { $exists: true } });
  console.log(`📊 Documentos restantes com campo 'tipo': ${countAfter}`);

  await mongoose.disconnect();
  console.log('🔌 Desconectado do MongoDB');
}

migrate()
  .then(() => {
    console.log('🎉 Script finalizado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  });

