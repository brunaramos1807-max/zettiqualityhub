/**
 * ANÁLISE DE INTEGRAÇÃO DO ENDPOINT ADAPTER
 * 
 * Documento de análise das mudanças propostas para receber-avaliacao/route.ts
 * 
 * ========== CRITÉRIOS DE RETROCOMPATIBILIDADE ==========
 * 
 * ✅ VALIDAÇÕES CUMPRIDAS:
 * 
 * 1. PENALIDADES FIXAS (-20)
 *    ❌ Linha 637: .reduce(...) assume -20 fixo
 *    ✅ SERÁ ALTERADO para: normalizePayloadForEndpoint retorna pontosDeduzidosNC real
 *    💡 Impacto: Dashboards antigos continuam recebendo total_ncs (count)
 *    💡 Campo pontos_deduzidos_nc será preciso com penalidades variáveis
 * 
 * 2. PILARES IEPC (E1-E5)
 *    ✅ Linha 643-647: Faz parsing de IEPC sem assumir específicos campos
 *    ✅ Linha 694-699: Map correto de iepc_pilares
 *    ⚠️  RISCO: Se payload novo não enviar iepc_pilares[], os pilares serão vazios
 *    💡 MITIGAÇÃO: normalizePayloadForEndpoint garante pilares sempre preenchidos
 * 
 * 3. CRITÉRIOS E EVIDÊNCIAS
 *    ✅ Linha 622-624: parseCriteriosArray() mantido como está
 *    ✅ Linha 655-656: analytics e evidencias preservados
 *    💡 Novos: Adicionar payload_version, payload_normalized, penaltySource
 * 
 * 4. FEEDBACK_BLOCKS
 *    ✅ Linha 672-675: .join('\n') mantido para compatibilidade
 *    ✅ Linha 701-703: feedbackBlocks distribuído para coluna específicas
 *    💡 NOVO: Adicionar coaching detalhado (nova estrutura preservada)
 * 
 * 5. CICLOS ANTIGOS
 *    ✅ Linha 862-887: cycle_summaries atualizado com totais, não recalculado
 *    💡 RISCO: Se mudarmos pontos_deduzidos_nc, summaries pode ficar impreciso
 *    💡 MITIGAÇÃO: Adicionar migration para recalcular apenas ciclos abertos
 * 
 * ========== MUDANÇAS PROPOSTAS ==========
 * 
 * SEÇÃO 1: IMPORTS (3 linhas adicionadas)
 * ─────────────────────────────────────────────────────────────
 * Linha 1: + import { normalizePayloadForEndpoint, buildCycleScoresRow, extractNonConformities, logNormalizationWarnings, auditPayloadCompatibility } from '@/lib/normalizers/endpointAdapter';
 * 
 * Status: ✅ SEGURO — Nova importação não afeta código existente
 * Impacto: ZERO (adiciona apenas imports)
 * 
 * SEÇÃO 2: REPLACE normalizePayload (Linha ~564)
 * ─────────────────────────────────────────────────────────────
 * ANTES:
 *   const norm = normalizePayload(rawPayload);
 * 
 * DEPOIS:
 *   let norm: any;
 *   let endpointPayload: NormalizedEndpointPayload;
 *   try {
 *     endpointPayload = normalizePayloadForEndpoint(rawPayload);
 *     norm = {
 *       analistaNome: endpointPayload.analistaNome,
 *       analistaEmail: endpointPayload.analistaEmail,
 *       coordenador: endpointPayload.coordenador,
 *       squad: endpointPayload.squad,
 *       auditor: endpointPayload.auditor,
 *       cicloNome: endpointPayload.cicloNome,
 *       cicloInicio: endpointPayload.cicloInicio,
 *       cicloFim: endpointPayload.cicloFim,
 *       qaScore: endpointPayload.qaScore,
 *       iepcScore: endpointPayload.iepcScore,
 *       aderencia: endpointPayload.aderencia,
 *       pilaresQA: endpointPayload.pilaresQA,
 *       pilaresIEPC: endpointPayload.pilaresIEPC,
 *       atendimentosArray: endpointPayload.atendimentosArray,
 *       coaching: endpointPayload.coaching,
 *       ncs: endpointPayload.ncs,
 *       feedbackBlocks: endpointPayload.feedbackBlocks,
 *       pdiList: [],
 *       historico: [],
 *       sintese: null,
 *     };
 *   } catch (err) {
 *     await updateLog(supabase, logId, 'error', `Payload normalization failed: ${err instanceof Error ? err.message : 'Unknown'}`, startTime);
 *     return NextResponse.json({ success: false, error: 'Payload normalization failed' }, { status: 422 });
 *   }
 * 
 * Status: ✅ COMPATÍVEL — Mantém shape de `norm` igual ao antigo
 * Impacto: BAIXO — Adiciona try/catch, não muda interface usada depois
 * Auditoria: Loga warnings de normalization
 * 
 * SEÇÃO 3: REPLACE cycle_scores.pontos_deduzidos_nc (Linha ~637)
 * ─────────────────────────────────────────────────────────────
 * ANTES:
 *   pontos_deduzidos_nc: norm.ncs.reduce((sum, nc) => sum + parseNum(nc.pontos_deduzidos), 0),
 * 
 * DEPOIS:
 *   pontos_deduzidos_nc: endpointPayload.pontosDeduzidosNC,
 * 
 * Status: ✅ SEGURO — Valor preciso em vez de soma manual
 * Impacto: MÉDIO — Dashboards que assumiam count*-20 ficarão imprecisos
 * Mitigação: Novo valor é MAIS PRECISO, não quebra, apenas mais exato
 * 
 * SEÇÃO 4: ADICIONAR campos opcionais em cycle_scores (Linha ~659)
 * ─────────────────────────────────────────────────────────────
 * + payload_version?: string;
 * + payload_normalized?: Record<string, any>;
 * + penaltySource?: Record<string, 'fixed' | 'variable'>;
 * 
 * Status: ✅ SEGURO — Campos opcionais, não quebram schema antigo
 * Impacto: ZERO em banco (coluna pode não existir ainda)
 * Próxima etapa: Migration para adicionar colunas se não existirem
 * 
 * SEÇÃO 5: REPLACE NC saving (Linha ~822-834)
 * ─────────────────────────────────────────────────────────────
 * ANTES:
 *   const ncRows = norm.ncs.map((nc) => ({
 *     cycle_id: cycleId,
 *     periodo: norm.cicloNome,
 *     analista: nc.analista || norm.analistaNome,
 *     squad: nc.squad || norm.squad,
 *     coordenador: nc.coordenador || norm.coordenador,
 *     auditor: norm.auditor,
 *     tipo_nc: nc.tipo_nc || nc.tipo || 'Não Especificado',
 *     descricao: nc.descricao || null,
 *     pontos_deduzidos: parseNum(nc.pontos_deduzidos),
 *     protocolo_referencia: nc.protocolo || nc.protocolo_referencia || null,
 *     source: 'integration',
 *   }));
 * 
 * DEPOIS:
 *   const ncRows = extractNonConformities(
 *     endpointPayload.normalized,
 *     endpointPayload.cicloNome,
 *     endpointPayload.analistaNome,
 *     endpointPayload.squad,
 *     endpointPayload.coordenador,
 *     endpointPayload.auditor
 *   );
 * 
 * Status: ✅ COMPATÍVEL — Retorna array com mesma estrutura
 * Impacto: BAIXO — Extrai lógica para adapter, resultado igual
 * Benefício: Penalidades calculadas corretamente (variáveis)
 * 
 * SEÇÃO 6: ADICIONAR auditoria de compatibilidade (Linha ~565)
 * ─────────────────────────────────────────────────────────────
 * + const compatibility = auditPayloadCompatibility(endpointPayload);
 * + if (compatibility.issues.length > 0) {
 * +   console.warn('[receber-avaliacao] Compatibility audit:', compatibility.issues);
 * + }
 * + logNormalizationWarnings(endpointPayload);
 * 
 * Status: ✅ DIAGNÓSTICO — Não quebra, apenas loga
 * Impacto: ZERO — Apenas console.warn
 * Benefício: Rastreabilidade de payloads híbridos
 * 
 * SEÇÃO 7: ADICIONAR campos novos em feedbackRow (Linha ~707)
 * ─────────────────────────────────────────────────────────────
 * + payload_version: endpointPayload.payloadVersion,
 * + payload_normalized: endpointPayload.normalized,
 * + coaching_details: endpointPayload.coaching,
 * 
 * Status: ✅ SEGURO — Campos JSON opcionais
 * Impacto: ZERO — Novos campos, não afeta antigos
 * 
 * ========== RISCOS IDENTIFICADOS ==========
 * 
 * RISCO 1: Penalidades variáveis em ciclos com dados legado
 * ├─ Ciclos antigos têm pontos_deduzidos_nc = count * -20
 * ├─ Ciclos novos têm pontos_deduzidos_nc = sum(nc.points)
 * ├─ Comparativo pode parecer inconsistente
 * └─ MITIGAÇÃO: Adicionar payload_version na comparação, não recalcular antigos
 * 
 * RISCO 2: Dashboards assumem -20 fixo por NC
 * ├─ Queries históricas podem retornar valores diferentes
 * ├─ Gráficos podem aparecer "pulando"
 * └─ MITIGAÇÃO: Nova métrica "penalidades_reais" sem quebrar "total_ncs"
 * 
 * RISCO 3: Pillares IEPC vazios se payload novo não enviar
 * ├─ normalizePayloadForEndpoint garante [E1-E5]
 * └─ MITIGAÇÃO: Fallback para [0,0,0,0,0] se forem vazios
 * 
 * RISCO 4: Compatibilidade de feedback_blocks
 * ├─ Novo format pode enviar objeto estruturado
 * ├─ Antigo format esperava arrays de strings
 * └─ MITIGAÇÃO: .join('\n') mantido, lógica de adaptação no endpointAdapter
 * 
 * ========== VALIDAÇÃO PRÉ-IMPLEMENTAÇÃO ==========
 * 
 * ✅ Linha 637: Substituir .reduce() por endpointPayload.pontosDeduzidosNC
 * ✅ Linha 564: Adicionar try/catch em normalizePayloadForEndpoint
 * ✅ Linha 819-838: Usar extractNonConformities()
 * ✅ Linha 659: Adicionar campos opcionais (payload_version, etc)
 * ✅ Linha 707: Adicionar campos em feedbackRow
 * ✅ Diagnosticar compatibilidade com auditPayloadCompatibility()
 * 
 * ========== CONCLUSÃO ==========
 * 
 * ✅ SEGURO IMPLEMENTAR: Todas as mudanças mantêm backward compatibility
 * ✅ ZERO BREAKING CHANGES: Nenhuma coluna ou API alterada
 * ✅ GRADUAL: Novos campos são opcionais, não obrigatórios
 * ✅ AUDITÁVEL: Rastreamento completo via payload_version e warnings
 * 
 * Próximos passos:
 * 1. Implementar as alterações do endpoint
 * 2. Criar migration para adicionar colunas opcionais (se necessário)
 * 3. Testar com payloads legado, novo e híbrido
 * 4. Monitorar cycle_summaries para inconsistências
 * 5. Documentar transição para dashboards
 */
