import type { Appointment, Client, Inspiration, Invoice, Lead, Outreach, Product, Project, ProjectPhoto, SocialPost, Workspace } from '~/lib/types'

// Fictional data for design validation only. Dates are relative to today so the
// agenda and due dates always look current.
const day = (offset: number) => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=75`

const clients: Client[] = [
  { id: 'c1', name: 'Aminata Djaló', email: 'aminata.djalo@email.com', phone: '+245 955 412 300', city: 'Bissau', country: 'Guiné-Bissau', type: 'Particular', status: 'Ativo', since: day(-210), notes: 'Prefere contacto por WhatsApp ao fim da tarde. Gosta de tons terra e madeira natural.' },
  { id: 'c2', name: 'Ricardo Mendes', company: 'Hotel Atlântico', email: 'r.mendes@hotelatlantico.sn', phone: '+221 77 512 34 87', city: 'Dakar', country: 'Senegal', type: 'Hotelaria', status: 'Ativo', since: day(-140), notes: 'Renovação faseada de 24 quartos. Decisões validadas pela direção às sextas.' },
  { id: 'c3', name: 'Fatou Sané', email: 'fatou.sane@email.com', phone: '+221 77 845 21 09', city: 'Dakar', country: 'Senegal', type: 'Particular', status: 'Ativo', since: day(-95) },
  { id: 'c4', name: 'Bruno Cabral', company: 'Cabral & Filhos Advogados', email: 'bruno@cabral-advogados.gw', phone: '+245 966 201 455', city: 'Bissau', country: 'Guiné-Bissau', type: 'Empresa', status: 'Ativo', since: day(-60), notes: 'Escritório de 180 m². Cortinados já instalados na sala de reuniões.' },
  { id: 'c5', name: 'Mariama Baldé', company: 'Restaurante Kriol', email: 'ola@kriol.gw', phone: '+245 955 778 120', city: 'Bissau', country: 'Guiné-Bissau', type: 'Restauração', status: 'Potencial', since: day(-12), notes: 'Pediu orçamento para sala e esplanada. Primeira reunião marcada.' },
  { id: 'c6', name: 'Inês Carvalho', email: 'ines.carvalho@email.pt', phone: '+351 936 552 019', city: 'Porto', country: 'Portugal', type: 'Particular', status: 'Ativo', since: day(-300) },
  { id: 'c7', name: 'Samba Embaló', email: 'samba.embalo@email.com', phone: '+245 966 330 812', city: 'Bafatá', country: 'Guiné-Bissau', type: 'Particular', status: 'Arquivado', since: day(-420) },
]

const projects: Project[] = [
  { id: 'p1', name: 'Moradia Djaló', clientId: 'c1', location: 'Bissau, Bairro de Ajuda', phase: 'Obra', progress: 64, budget: 31_500_000, spent: 19_750_000, startDate: day(-120), dueDate: day(45), cover: '/media/hero-interior.jpg', rooms: ['Sala de estar', 'Cozinha', 'Suite principal', 'Hall de entrada'], description: 'Remodelação integral de uma moradia T4, com mobiliário à medida produzido na fábrica Quennie.', type: 'Residencial', services: ['Projeto 3D', 'Mobiliário à medida', 'Acompanhamento de obra'], leadSource: 'Instagram', priority: 'Alta', address: 'Rua 12, junto à escola de Ajuda', propertyType: 'Moradia', condition: 'Renovação', area: 240, floors: 2, occupants: 'Casal, 2 filhos (7 e 12 anos), avó a viver na casa', constraints: 'Parede da cozinha é estrutural. Obra só das 8h às 17h por causa dos vizinhos.', styles: ['Afro-contemporâneo', 'Minimalista'], palette: ['#48280f', '#8f6e52', '#c8a984', '#efe2cf', '#4a5240'], materialsLove: 'Madeira natural, linho, pedra clara', materialsAvoid: 'Brilhos e cinzento frio', keepItems: 'Mesa de jantar em pau-sangue da família', budgetFlex: 'Margem de 10%', feeModel: 'Percentagem da obra', feeValue: 12, depositRate: 0.3, contacts: [{ role: 'Decisor', name: 'Aminata Djaló', phone: '+245 955 412 300' }, { role: 'Empreiteiro', name: 'Construções Mansoa', phone: '+245 966 118 402' }], kickoff: ['Briefing com o cliente', 'Visita e medições', 'Fotos do existente', 'Plantas recebidas', 'Proposta enviada', 'Contrato assinado', 'Adiantamento recebido'] },
  { id: 'p2', name: 'Hotel Atlântico, piso 2', clientId: 'c2', location: 'Dakar, Plateau', phase: 'Encomendas', progress: 42, budget: 82_650_000, spent: 27_400_000, startDate: day(-80), dueDate: day(110), cover: unsplash('1631679706909-1844bbd07221'), rooms: ['12 quartos', 'Corredor', 'Lounge'], description: 'Primeira fase da renovação dos quartos: cabeceiras, têxteis e iluminação.', type: 'Hotelaria', services: ['Projeto 3D', 'Mobiliário à medida', 'Styling e decoração'], leadSource: 'Recomendação', priority: 'Normal', propertyType: 'Hotel', condition: 'Ocupado, só decoração', area: 620, floors: 1, occupants: 'Hóspedes de negócios, ocupação média de 80%', constraints: 'Hotel aberto durante a obra: no máximo 3 quartos fechados de cada vez.', styles: ['Contemporâneo', 'Afro-contemporâneo'], palette: ['#354e5f', '#7d8387', '#d8dae1', '#c9a98a'], budgetFlex: 'Fechado', feeModel: 'Valor fixo', feeValue: 9_800_000, depositRate: 0.4, hardDeadline: 'Inauguração do piso antes da época alta', contacts: [{ role: 'Decisor', name: 'Ricardo Mendes', phone: '+221 77 512 34 87' }, { role: 'Contacto em obra', name: 'Awa Ndiaye, governanta', phone: '+221 78 220 41 90' }], kickoff: ['Briefing com o cliente', 'Visita e medições', 'Fotos do existente', 'Plantas recebidas', 'Proposta enviada', 'Contrato assinado', 'Adiantamento recebido'] },
  { id: 'p3', name: 'Apartamento Sané', clientId: 'c3', location: 'Dakar, Almadies', phase: 'Projeto 3D', progress: 28, budget: 21_000_000, spent: 2_760_000, startDate: day(-35), dueDate: day(90), cover: '/media/7673540222692379911-06.webp', rooms: ['Sala', 'Quarto', 'Varanda'] },
  { id: 'p4', name: 'Escritório Cabral', clientId: 'c4', location: 'Bissau, Avenida Amílcar Cabral', phase: 'Entrega', progress: 92, budget: 14_750_000, spent: 13_950_000, startDate: day(-58), dueDate: day(6), cover: '/media/7673556834803846407-04.webp', rooms: ['Receção', 'Sala de reuniões', '4 gabinetes'] },
  { id: 'p5', name: 'Restaurante Kriol', clientId: 'c5', location: 'Bissau, Bissau Velho', phase: 'Conceito', progress: 8, budget: 26_250_000, spent: 0, startDate: day(-5), dueDate: day(150), cover: '/media/7659460783184547092-04.webp', rooms: ['Sala', 'Bar', 'Esplanada'], type: 'Restauração', services: ['Consultoria', 'Projeto 3D', 'Chave na mão'], leadSource: 'TikTok', priority: 'Alta', address: 'Bissau Velho, frente ao porto', propertyType: 'Restaurante', condition: 'Renovação', area: 210, floors: 1, occupants: '80 lugares, 12 funcionários', constraints: 'Edifício colonial: fachada não pode ser alterada.', styles: ['Tropical', 'Afro-contemporâneo'], palette: ['#514c3a', '#a79682', '#e6e1db', '#9a5934'], materialsLove: 'Tecidos locais, rattan, pedra', budgetFlex: 'Flexível', feeModel: 'Por m²', feeValue: 18_000, depositRate: 0.3, hardDeadline: 'Abertura do restaurante', contacts: [{ role: 'Decisor', name: 'Mariama Baldé', phone: '+245 955 778 120' }], kickoff: ['Briefing com o cliente', 'Visita e medições'] },
  { id: 'p6', name: 'Casa de praia Carvalho', clientId: 'c6', location: 'Comporta', phase: 'Concluído', progress: 100, budget: 24_950_000, spent: 24_200_000, startDate: day(-290), dueDate: day(-40), cover: '/media/7659460783184547092-06.webp', rooms: ['Sala', 'Exterior', '3 quartos'] },
]

const products: Product[] = [
  { id: 'pr1', name: 'Móvel de TV suspenso, lacado', maker: 'Atelier Quennie', category: 'Mobiliário', price: 1_870_000, unit: 'peça', finish: 'Lacado mate, ripado em carvalho', dimensions: '280 × 45 × 40 cm', material: 'MDF hidrófugo, carvalho', leadTime: '4 semanas', image: '/media/7673540222692379911-03.webp', usage: [{ projectId: 'p1', room: 'Sala de estar', quantity: 1, status: 'Encomendado' }, { projectId: 'p3', room: 'Sala', quantity: 1, status: 'Proposto' }] },
  { id: 'pr2', name: 'Pendente cónico', maker: 'Luz & Forma', category: 'Iluminação', price: 225_000, unit: 'unid.', finish: 'Alumínio pintado, branco seda', dimensions: 'Ø 32 cm, suspensão 120 cm', material: 'Alumínio', leadTime: '2 semanas', image: unsplash('1513506003901-1e6a229e2d15'), usage: [{ projectId: 'p5', room: 'Bar', quantity: 6, status: 'Proposto' }] },
  { id: 'pr3', name: 'Banco alto em freixo', maker: 'Oficina Tábua', category: 'Mobiliário', price: 170_000, unit: 'unid.', finish: 'Freixo natural, óleo', dimensions: 'A 75 cm, assento Ø 34 cm', material: 'Freixo maciço', leadTime: '3 semanas', image: unsplash('1503602642458-232111445657'), usage: [{ projectId: 'p1', room: 'Cozinha', quantity: 3, status: 'Entregue' }] },
  { id: 'pr4', name: 'Consola em nogueira e latão', maker: 'Atelier Quennie', category: 'Mobiliário', price: 970_000, unit: 'peça', finish: 'Nogueira escura, latão escovado', dimensions: '140 × 35 × 82 cm', material: 'Nogueira, latão', leadTime: '5 semanas', image: '/media/7673556834803846407-03.webp', usage: [{ projectId: 'p1', room: 'Hall de entrada', quantity: 1, status: 'Encomendado' }, { projectId: 'p4', room: 'Receção', quantity: 1, status: 'Entregue' }] },
  { id: 'pr5', name: 'Sofá três lugares, pele cognac', maker: 'Casa Lusa', category: 'Mobiliário', price: 2_560_000, unit: 'peça', finish: 'Pele anilina, cognac', dimensions: '220 × 92 × 78 cm', material: 'Pele, pés em carvalho', leadTime: '6 semanas', image: unsplash('1540574163026-643ea20ade25'), usage: [{ projectId: 'p1', room: 'Sala de estar', quantity: 1, status: 'Encomendado' }] },
  { id: 'pr6', name: 'Cortinado em linho lavado', maker: 'Atelier Quennie', category: 'Têxteis', price: 44_600, unit: 'm²', finish: 'Linho natural, prega americana', dimensions: 'À medida', material: '100% linho', leadTime: '2 semanas', image: '/media/7673555504592948487-frame.webp', usage: [{ projectId: 'p4', room: 'Sala de reuniões', quantity: 24, status: 'Entregue' }, { projectId: 'p2', room: '12 quartos', quantity: 96, status: 'Encomendado' }] },
  { id: 'pr7', name: 'Poltrona capitonê marfim', maker: 'Casa Lusa', category: 'Mobiliário', price: 755_000, unit: 'unid.', finish: 'Bouclé marfim', dimensions: '72 × 70 × 86 cm', material: 'Bouclé, faia', leadTime: '4 semanas', image: unsplash('1567538096630-e0c55bd6374c'), usage: [{ projectId: 'p2', room: 'Lounge', quantity: 4, status: 'Proposto' }] },
  { id: 'pr8', name: 'Candeeiro de pé articulado', maker: 'Luz & Forma', category: 'Iluminação', price: 275_000, unit: 'unid.', finish: 'Aço grafite', dimensions: 'A 160 cm', material: 'Aço', leadTime: '1 semana', image: unsplash('1507473885765-e6ed057f782c'), usage: [] },
  { id: 'pr9', name: 'Estore de rolo screen', maker: 'Atelier Quennie', category: 'Têxteis', price: 35_400, unit: 'm²', finish: 'Screen 5%, areia', dimensions: 'À medida', material: 'Poliéster técnico', leadTime: '10 dias', image: '/media/7663446869720222996-frame.webp', usage: [{ projectId: 'p4', room: '4 gabinetes', quantity: 18, status: 'Entregue' }] },
  { id: 'pr10', name: 'Sofá em veludo verde palma', maker: 'Casa Lusa', category: 'Mobiliário', price: 1_740_000, unit: 'peça', finish: 'Veludo, verde palma', dimensions: '210 × 88 × 80 cm', material: 'Veludo, nogueira', leadTime: '6 semanas', image: unsplash('1555041469-a586c61ea9bc'), usage: [{ projectId: 'p3', room: 'Sala', quantity: 1, status: 'Proposto' }] },
  { id: 'pr11', name: 'Sofá exterior em alvenaria', maker: 'Atelier Quennie', category: 'Exterior', price: 2_760_000, unit: 'conjunto', finish: 'Microcimento areia, almofadas em acrílico', dimensions: 'Em L, 420 × 300 cm', material: 'Alvenaria, tecido outdoor', leadTime: '5 semanas', image: '/media/7659460783184547092-02.webp', usage: [{ projectId: 'p6', room: 'Exterior', quantity: 1, status: 'Entregue' }, { projectId: 'p5', room: 'Esplanada', quantity: 2, status: 'Proposto' }] },
  { id: 'pr12', name: 'Almofadas em linho riscado', maker: 'Tecelagem Bijagó', category: 'Têxteis', price: 29_500, unit: 'unid.', finish: 'Riscas terracota', dimensions: '50 × 50 cm', material: 'Linho e algodão', leadTime: '1 semana', image: unsplash('1616627561950-9f746e330187'), usage: [{ projectId: 'p1', room: 'Suite principal', quantity: 6, status: 'Proposto' }] },
  { id: 'pr13', name: 'Mesa de jantar em pedra', maker: 'Pedra Viva', category: 'Exterior', price: 2_030_000, unit: 'peça', finish: 'Travertino, base esculpida', dimensions: '240 × 100 × 75 cm', material: 'Travertino', leadTime: '8 semanas', image: '/media/7659460783184547092-03.webp', usage: [] },
  { id: 'pr14', name: 'Cadeira de jantar Lisa', maker: 'Oficina Tábua', category: 'Mobiliário', price: 140_000, unit: 'unid.', finish: 'Polipropileno preto, faia', dimensions: '48 × 52 × 82 cm', material: 'Polipropileno, faia', leadTime: '2 semanas', image: unsplash('1592078615290-033ee584e267'), usage: [{ projectId: 'p5', room: 'Sala', quantity: 32, status: 'Proposto' }] },
  { id: 'pr15', name: 'Estante suspensa modular', maker: 'Atelier Quennie', category: 'Decoração', price: 455_000, unit: 'conjunto', finish: 'Carvalho e lacado branco', dimensions: '180 × 25 × 90 cm', material: 'Carvalho', leadTime: '3 semanas', image: unsplash('1594026112284-02bb6f3352fe'), usage: [] },
  { id: 'pr16', name: 'Cadeira Concha', maker: 'Casa Lusa', category: 'Mobiliário', price: 645_000, unit: 'unid.', finish: 'Lacado branco, carvalho', dimensions: '92 × 83 × 74 cm', material: 'Contraplacado moldado', leadTime: '5 semanas', image: unsplash('1519947486511-46149fa0a254'), usage: [{ projectId: 'p2', room: 'Lounge', quantity: 2, status: 'Proposto' }] },
]

const invoices: Invoice[] = [
  { id: 'i1', number: 'FT 2026/031', clientId: 'c1', projectId: 'p1', issueDate: day(-45), dueDate: day(-15), status: 'Paga', vatRate: 0.19, lines: [{ description: 'Projeto de interiores, fase 2', quantity: 1, unitPrice: 4_260_000 }, { description: 'Mobiliário à medida, adiantamento 50%', quantity: 1, unitPrice: 6_430_000 }] },
  { id: 'i2', number: 'FT 2026/034', clientId: 'c2', projectId: 'p2', issueDate: day(-30), dueDate: day(0), status: 'Enviada', vatRate: 0.19, lines: [{ description: 'Cabeceiras estofadas', quantity: 12, unitPrice: 585_000 }, { description: 'Cortinados em linho, confeção', quantity: 96, unitPrice: 44_600 }] },
  { id: 'i3', number: 'FT 2026/029', clientId: 'c4', projectId: 'p4', issueDate: day(-52), dueDate: day(-22), status: 'Em atraso', vatRate: 0.19, lines: [{ description: 'Estores de rolo screen, 4 gabinetes', quantity: 18, unitPrice: 35_400 }, { description: 'Montagem e instalação', quantity: 1, unitPrice: 425_000 }] },
  { id: 'i4', number: 'FT 2026/036', clientId: 'c3', projectId: 'p3', issueDate: day(-8), dueDate: day(22), status: 'Enviada', vatRate: 0.19, lines: [{ description: 'Estudo de conceito e moodboard', quantity: 1, unitPrice: 1_570_000 }, { description: 'Modelação 3D, 3 divisões', quantity: 3, unitPrice: 395_000 }] },
  { id: 'i5', number: 'FT 2026/037', clientId: 'c1', projectId: 'p1', issueDate: day(-2), dueDate: day(28), status: 'Rascunho', vatRate: 0.19, lines: [{ description: 'Coordenação de obra, outubro', quantity: 1, unitPrice: 1_440_000 }] },
  { id: 'i6', number: 'FT 2026/027', clientId: 'c6', projectId: 'p6', issueDate: day(-70), dueDate: day(-40), status: 'Paga', vatRate: 0.19, lines: [{ description: 'Sofá exterior em alvenaria', quantity: 1, unitPrice: 2_760_000 }, { description: 'Decoração final e styling', quantity: 1, unitPrice: 1_180_000 }] },
  { id: 'i7', number: 'FT 2026/035', clientId: 'c4', projectId: 'p4', issueDate: day(-14), dueDate: day(16), status: 'Paga', vatRate: 0.19, lines: [{ description: 'Consola em nogueira e latão', quantity: 1, unitPrice: 970_000 }, { description: 'Cortinados sala de reuniões', quantity: 24, unitPrice: 44_600 }] },
]

const appointments: Appointment[] = [
  { id: 'a1', title: 'Validação do móvel de TV', type: 'Reunião', date: day(0), start: '09:30', end: '10:30', clientId: 'c1', projectId: 'p1', location: 'Moradia Djaló', notes: 'Levar amostras de lacado e ripado.' },
  { id: 'a2', title: 'Medições sala e esplanada', type: 'Medições', date: day(0), start: '15:00', end: '16:30', clientId: 'c5', projectId: 'p5', location: 'Restaurante Kriol, Bissau Velho' },
  { id: 'a3', title: 'Entrega de cortinados', type: 'Entrega', date: day(1), start: '10:00', end: '12:00', clientId: 'c4', projectId: 'p4', location: 'Escritório Cabral' },
  { id: 'a4', title: 'Visita à fábrica de estofos', type: 'Fornecedor', date: day(2), start: '11:00', end: '12:30', location: 'Casa Lusa, Paços de Ferreira', notes: 'Ver protótipo das cabeceiras do hotel.' },
  { id: 'a5', title: 'Apresentação 3D', type: 'Reunião', date: day(3), start: '17:00', end: '18:00', clientId: 'c3', projectId: 'p3', location: 'Videochamada' },
  { id: 'a6', title: 'Montagem cozinha', type: 'Montagem', date: day(4), start: '08:30', end: '17:00', clientId: 'c1', projectId: 'p1', location: 'Moradia Djaló' },
  { id: 'a7', title: 'Visita técnica, piso 2', type: 'Visita técnica', date: day(-1), start: '14:00', end: '16:00', clientId: 'c2', projectId: 'p2', location: 'Hotel Atlântico' },
  { id: 'a8', title: 'Entrega final e checklist', type: 'Entrega', date: day(6), start: '10:00', end: '11:30', clientId: 'c4', projectId: 'p4', location: 'Escritório Cabral' },
  { id: 'a9', title: 'Escolha de tecidos', type: 'Reunião', date: day(8), start: '15:30', end: '16:30', clientId: 'c2', projectId: 'p2', location: 'Estúdio Quennie' },
]


const m = (file: string) => `/media/${file}.webp`

const inspirations: Inspiration[] = [
  { id: 'in1', title: 'Hall em ripado de carvalho', image: m('7673556834803846407-02'), board: 'Halls de entrada', source: 'Instagram', tags: ['madeira', 'linhas verticais', 'espelho redondo'], palette: ['#48280f', '#664428', '#8f6e52', '#a18873', '#d9c9b6'], projectId: 'p1', note: 'Referência para o hall da moradia Djaló: porta pivotante e consola suspensa.', favorite: true, savedAt: day(-3) },
  { id: 'in2', title: 'Linhas curvas e luz indireta', image: m('7673556834803846407-04'), board: 'Halls de entrada', source: 'Instagram', tags: ['curvas', 'luz indireta', 'tadelakt'], palette: ['#4f351b', '#6e4f31', '#94704d', '#c8a984', '#efe2cf'], savedAt: day(-3) },
  { id: 'in3', title: 'Pedra escura e nogueira', image: m('7673556834803846407-05'), board: 'Halls de entrada', source: 'Instagram', tags: ['pedra', 'nogueira', 'contraste'], palette: ['#25150a', '#3c2617', '#463425', '#7d6047', '#a5886c'], projectId: 'p4', savedAt: day(-4) },
  { id: 'in4', title: 'Elegância intemporal', image: m('7673556834803846407-03'), board: 'Halls de entrada', source: 'Pinterest', tags: ['clássico', 'molduras', 'sanca'], palette: ['#2c1d0d', '#503c24', '#735a3e', '#856b4d', '#d8c7ad'], savedAt: day(-6) },
  { id: 'in5', title: 'Parede de TV em mármore', image: m('7673540222692379911-04'), board: 'Paredes de TV', source: 'Instagram', tags: ['mármore', 'ripado', 'LED'], palette: ['#3d342b', '#806e5e', '#91887e', '#a49585', '#aea396'], projectId: 'p1', favorite: true, savedAt: day(-8) },
  { id: 'in6', title: 'Móvel suspenso com nicho', image: m('7673540222692379911-03'), board: 'Paredes de TV', source: 'Própria', tags: ['lacado', 'nicho', 'atelier'], palette: ['#52463b', '#958575', '#aa9a8a', '#b7a99b', '#c1b6ab'], projectId: 'p3', note: 'Base do móvel de TV que estamos a produzir na fábrica.', savedAt: day(-9) },
  { id: 'in7', title: 'Sala com arco e madeira', image: m('7673540222692379911-06'), board: 'Paredes de TV', source: 'Pinterest', tags: ['arco', 'nicho iluminado'], palette: ['#615143', '#a3998b', '#b2aea5', '#bbb3a7', '#c5bfb5'], projectId: 'p3', savedAt: day(-11) },
  { id: 'in8', title: 'Painel ripado claro', image: m('7673540222692379911-02'), board: 'Paredes de TV', source: 'Instagram', tags: ['ripado', 'tons claros'], palette: ['#57584b', '#928f84', '#a19a90', '#b0aaa2', '#c3bdb6'], savedAt: day(-12) },
  { id: 'in9', title: 'Pátio com pérgola de lona', image: m('7659460783184547092-02'), board: 'Exteriores', source: 'Instagram', tags: ['pátio', 'lona', 'alvenaria'], palette: ['#514c3a', '#a79682', '#b4aea5', '#c3b5a6', '#e6e1db'], projectId: 'p5', note: 'Esplanada do Kriol: sombra em lona e bancos em alvenaria.', favorite: true, savedAt: day(-2) },
  { id: 'in10', title: 'Mesa em pedra esculpida', image: m('7659460783184547092-03'), board: 'Exteriores', source: 'Fornecedor', tags: ['travertino', 'rattan'], palette: ['#62513c', '#8f7f6d', '#ac8e70', '#c0a890', '#ccbbaa'], projectId: 'p5', savedAt: day(-2) },
  { id: 'in11', title: 'Jantar exterior junto à piscina', image: m('7659460783184547092-04'), board: 'Exteriores', source: 'Viagem', tags: ['piscina', 'vegetação tropical'], palette: ['#544937', '#6a674c', '#826a58', '#99937b', '#c1b9b1'], savedAt: day(-15) },
  { id: 'in12', title: 'Cozinha de verão', image: m('7659460783184547092-05'), board: 'Exteriores', source: 'Pinterest', tags: ['bar', 'pendentes', 'pedra'], palette: ['#4e412b', '#726959', '#92806c', '#aea89f', '#cbc4bc'], projectId: 'p5', savedAt: day(-16) },
  { id: 'in13', title: 'Lounge exterior em L', image: m('7659460783184547092-06'), board: 'Exteriores', source: 'Própria', tags: ['lounge', 'fibras naturais'], palette: ['#523f2b', '#7d6a56', '#8b7158', '#a1907e', '#afa292'], projectId: 'p6', savedAt: day(-40) },
  { id: 'in14', title: 'Cabeceira capitonê azul', image: m('7652338046658039061-frame'), board: 'Quartos', source: 'Instagram', tags: ['cabeceira', 'azul petróleo'], palette: ['#354e5f', '#7d8387', '#908b89', '#a5a7aa', '#d8dae1'], projectId: 'p2', note: 'Proposta para os quartos do hotel: cabeceira até ao teto.', savedAt: day(-20) },
  { id: 'in15', title: 'Do vazio ao projeto 3D', image: m('7673552471175875858-02'), board: 'Antes e depois', source: 'Obra', tags: ['3D', 'sala', 'transformação'], palette: ['#382f25', '#726352', '#90806c', '#aa9d8e', '#c1b6a7'], savedAt: day(-25) },
  { id: 'in16', title: 'Sala de jantar, visão 3D', image: m('7673552471175875858-04'), board: 'Antes e depois', source: 'Obra', tags: ['3D', 'jantar'], palette: ['#71604a', '#928472', '#9e8f7b', '#a99c8d', '#b3a79b'], projectId: 'p3', savedAt: day(-26) },
]

const at = (offset: number, hour = 10) => `${day(offset)}T${String(hour).padStart(2, '0')}:15:00.000Z`

// Site photos by stage on two projects, so the gallery and before/after compare have something to show.
const photo = (id: string, file: string, stage: ProjectPhoto['stage'], offset: number, caption?: string): ProjectPhoto => ({ id, url: `/media/${file}.webp`, stage, takenAt: day(offset), caption })
const projectPhotos: Record<string, ProjectPhoto[]> = {
  p1: [
    photo('ph1', '7673552471175875858-01', 'Antes', -118, 'Sala vazia na primeira visita'),
    photo('ph2', '7673552471175875858-02', '3D', -90, 'Proposta 3D da sala'),
    photo('ph3', '7673552471175875858-03', 'Obra', -30, 'Montagem do móvel de TV'),
    photo('ph4', '7673540222692379911-01', 'Depois', -3, 'Sala de estar'),
    photo('ph5', '7673540222692379911-04', 'Depois', -3),
  ],
  p6: [
    photo('ph6', '7659460783184547092-01', 'Antes', -280),
    photo('ph7', '7659460783184547092-06', 'Depois', -40, 'Lounge exterior'),
    photo('ph8', '7659460783184547092-02', 'Depois', -40, 'Pátio'),
  ],
}
for (const p of projects) if (projectPhotos[p.id]) p.photos = projectPhotos[p.id]

const leads: Lead[] = [
  { id: 'le1', name: 'Adama Sow', phone: '+221 77 640 22 18', email: 'adama.sow@email.sn', space: 'Casa', services: ['Design de interiores', 'Mobiliário à medida'], country: 'Senegal', city: 'Dakar', timing: 'Nos próximos 3 meses', message: 'Apartamento novo de 3 quartos em Ngor. Gostava de mobiliar a sala e a suite.', source: 'Site', status: 'Novo', receivedAt: at(0, 8) },
  { id: 'le2', name: 'Nádia Gomes', phone: '+245 955 230 117', space: 'Casa', services: ['Cortinados & estores'], country: 'Guiné-Bissau', city: 'Bissau', timing: 'Assim que possível', preferences: 'Cortinado, linho areia, prega americana. Medidas aproximadas: 320 × 270 cm.', source: 'Site', status: 'Novo', receivedAt: at(-1, 16) },
  { id: 'le3', name: 'Hotel Kapa', phone: '+245 966 401 900', email: 'direcao@hotelkapa.gw', space: 'Hotel', services: ['Design de interiores', 'Remodelações'], country: 'Guiné-Bissau', city: 'Bubaque', message: 'Renovação de 8 bungalows antes da época alta.', source: 'Instagram', status: 'Contactado', receivedAt: at(-6), nextFollowUp: day(0) },
  { id: 'le4', name: 'Carla Monteiro', phone: '+351 912 554 870', email: 'carla.monteiro@email.pt', space: 'Casa', services: ['Design de interiores'], country: 'Portugal', city: 'Lisboa', source: 'Recomendação', status: 'Orçamento enviado', receivedAt: at(-14), nextFollowUp: day(2), notes: 'Proposta de 12 M FCFA enviada a ' + day(-8) + '.' },
  { id: 'le5', name: 'Ibrahima Diallo', phone: '+245 966 778 004', space: 'Escritório', services: ['Mobiliário à medida'], country: 'Guiné-Bissau', city: 'Bissau', source: 'TikTok', status: 'Perdido', receivedAt: at(-30), notes: 'Escolheu mobiliário de catálogo.' },
]

const outreach: Outreach[] = [
  { id: 'ou1', recipientKind: 'lead', recipientId: 'le3', channel: 'WhatsApp', text: 'Olá, obrigada pelo seu pedido! Podemos marcar uma visita aos bungalows esta semana?', sentAt: at(-5) },
  { id: 'ou2', recipientKind: 'lead', recipientId: 'le4', channel: 'Email', text: 'Segue em anexo a proposta para o seu apartamento em Lisboa.', sentAt: at(-8) },
  { id: 'ou3', recipientKind: 'client', recipientId: 'c6', channel: 'WhatsApp', text: 'Olá Inês, foi um prazer trabalhar na Casa de praia Carvalho. Está tudo como sonhou?', sentAt: at(-35) },
]

const posts: SocialPost[] = [
  { id: 'po1', title: 'Antes e depois, sala Djaló', caption: `Antes ➝ depois ✨

Moradia Djaló, Bissau. Deslize para ver a transformação da sala.

Quer transformar o seu espaço? Peça o seu orçamento pelo link na bio.`, hashtags: ['#quennie', '#interiordesign', '#antesedepois', '#bissau'], images: ['/media/7673552471175875858-01.webp', '/media/7673540222692379911-01.webp'], platforms: ['Instagram', 'Facebook'], status: 'Agendado', scheduledFor: day(1), projectId: 'p1' },
  { id: 'po2', title: 'Bastidores, fábrica', caption: `Bastidores da obra 🛠️

O móvel de TV da Moradia Djaló a sair da nossa fábrica.`, hashtags: ['#quennie', '#mobiliarioamedida', '#bissau'], images: ['/media/7673552471175875858-03.webp'], platforms: ['Instagram', 'TikTok'], status: 'Agendado', scheduledFor: day(4), projectId: 'p1' },
  { id: 'po3', title: 'Lounge exterior Comporta', caption: `Casa de praia Carvalho ✨

Um exterior pensado para longas tardes de verão.`, hashtags: ['#quennie', '#exteriores', '#comporta'], images: ['/media/7659460783184547092-06.webp'], platforms: ['Instagram'], status: 'Publicado', scheduledFor: day(-10), projectId: 'p6' },
  { id: 'po4', title: 'Cortinados em linho', caption: `O detalhe faz o espaço.

Linho lavado, prega americana e luz filtrada.`, hashtags: ['#quennie', '#cortinados', '#linho'], images: ['/media/7673555504592948487-frame.webp'], platforms: ['Instagram', 'Estado WhatsApp'], status: 'Ideia' },
]

export const seed = (): Workspace => ({
  clients: structuredClone(clients),
  projects: structuredClone(projects),
  products: structuredClone(products),
  invoices: structuredClone(invoices),
  appointments: structuredClone(appointments),
  inspirations: structuredClone(inspirations),
  leads: structuredClone(leads),
  // Empty on purpose: the app offers its suggested templates until the studio saves its own.
  templates: [],
  outreach: structuredClone(outreach),
  posts: structuredClone(posts),
})
