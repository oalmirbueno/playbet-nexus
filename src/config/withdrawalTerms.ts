/**
 * Playbet — Termos de saque (versão 1)
 * Exibido no wizard de primeiro saque e no aviso a cada solicitação.
 */
export const WITHDRAWAL_TERMS_VERSION = "1.0";

export const WITHDRAWAL_TERMS = [
  {
    title: "Ciclo mensal",
    body:
      "Os saques são pagos uma vez por mês. Assim que sua comissão cai na conta da Playbet, o valor fica visível como \"pagamento a caminho\" e é liberado automaticamente em até 3 dias úteis.",
  },
  {
    title: "Notificação de liberação",
    body:
      "Você recebe uma notificação assim que o dinheiro estiver disponível. A partir desse momento pode solicitar o saque no valor que quiser, respeitando o saldo liberado.",
  },
  {
    title: "Nota fiscal obrigatória",
    body:
      "Todo pedido de saque exige o upload da nota fiscal correspondente. Sem NF anexada, o pedido não é enviado para a operação financeira.",
  },
  {
    title: "PF ou CNPJ",
    body:
      "Você pode receber como Pessoa Física ou via CNPJ. Ter CNPJ agiliza o processamento e reduz retenções. Os dados fiscais são usados para emissão da NF e conferência do pagamento.",
  },
  {
    title: "Prazo de pagamento",
    body:
      "Após a solicitação com NF válida, o pagamento via PIX é processado em até 2 dias úteis. O status pode ser acompanhado em tempo real na sua tela de saques.",
  },
];
