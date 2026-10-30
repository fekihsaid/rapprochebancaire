import type { IRapprochement } from '../services/models';

export const mockRapprochements: IRapprochement[] = [
  {
    id: 1,
    period: 'trimestriel',
    title: 'H005-Fondation - 2026 - September - 51201001 - BNP 001',
    month: 'September',
    year: '2026',
    account: '51201002-BNP 002',
    company: 'FonDation',
    genre: 'Banque',
    status: 'Refusé',
    signer1: 'Yassine fekih',
    signer2: '',
    secondPass: true,
    emitter: 'Émetteur fictif',
    refusalReason1: 'Document incomplet',
    refusalComment1: 'Merci de compléter les justificatifs.',
    contentType: 'Rapprochement Sociétés Sœurs',
    created: '2026-10-02T15:35:00',
    modified: '2026-10-05T16:36:00',
    author: 'Nelly BARON',
    editor: 'Julie GENESLAY',
    attachments: [
      { name: 'H005 - 51201002 09.2026.pdf', url: '#' }
    ]
  }
];
