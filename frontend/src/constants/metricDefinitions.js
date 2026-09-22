// Business definitions sourced from the "Metrics_Definitions_Tracker" reference doc.
// Shared between SnapshotTab (Value Snapshot) and UsageTab, which reuses the
// Spend Data definitions for its "see above" rows. Metrics with no definition
// in the tracker (e.g. Non-External Spend, Section 3/4 KPIs) are intentionally omitted.
export const METRIC_DEFINITIONS = {
  coupaPoSpend: 'The sum of approved purchase orders that were created and approved within Coupa (i.e., originated in Coupa, not imported from an external system). This explicitly excludes External PO spend.',
  nonPoInvoiceSpend: 'Approved invoice spend processed through Coupa that is not backed by a Purchase Order. This includes services billed under a contract without a PO (e.g., telco, leases, legal services), ad-hoc expense-type invoices (e.g., facility repair, lawn services), and supplier-initiated shipment/billing. This spend counts toward SG&A and public company reporting. Ingestion tools include Invoice Smash / Rossum.',
  externalPoBasedInvoiceSpend: 'Invoice spend processed through Coupa where the underlying PO was created in an external system (e.g., SAP, Oracle) and passed to Coupa for supplier routing and invoicing. Coupa did not generate the requisition or approval for these POs.',
  totalCoupaSpend: "Aligned with UBP Measure spend: per the contractual definition, Approved POs created in Coupa + approved invoices that don't have a PO + invoices created against externally created POs.",
  totalAddressableSpend: 'Spend that can be managed by Coupa and the customer team. Often excludes categories like taxes, Telco bills, and other categories that are typically managed outside Coupa.',
  onContractSavings: 'Calculated savings related to Coupa spend that is on contract. Customers regularly do not load all contract references in Coupa, so a discussion is needed to determine what spend is truly on contract. Customers should be coached to load their contract references for compliance/reporting and to help drive sourcing recommendations for the procurement team.',
  requisitionCycleTime: 'Requisition-to-Order Cycle Time is the average time it takes to process purchase orders, from the initial requisition to the final approved PO.',
  firstTimeMatchRate: 'The percentage of invoices that are two-way or three-way matched with POs and receiving documents, without the need for exception handling.',
  totalContracts: 'Total number of contracts referenced in Coupa, including both active and inactive contracts.',
  totalSourcingProjects: 'Total number of sourcing events that have been prepared or run over the last 12 months.',
  totalInvoiceSpend: 'Total invoice spend for approved invoices in USD. Includes Invoice on PO, Invoice on External PO, and Non-PO Invoice spend.',
  externalPoSpend: "The spend value of all PO lines in Coupa that originated from an external system (not created in Coupa). This is the external-PO component within PFI's total PO measure a_order. Distinct from External PO-Based Invoice Spend, which is the invoice value rather than the PO transaction value.",
  onContractSpend: 'Measures the percentage of spend put through pre-negotiated contracts to enable better spend-through-order prices and terms.',
  structuredSpend: 'Describes the percentage of spend that goes through company-hosted and vendor-hosted Spend on Orders catalogs (aka PunchOuts).',
  expenseSpend: 'Total expense spend.',
};
