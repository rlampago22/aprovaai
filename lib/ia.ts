// Interface da IA (fase 2: Azure OpenAI). Por ora, apenas um stub.

export interface GerarQuestoesParams {
  topicoId: number;
  quantidade: number;
}

export async function gerarQuestoes(params: GerarQuestoesParams): Promise<never> {
  void params;
  throw new Error("IA não configurada");
}
