const diceTypes = [
  {
    label: 'd4',
    faces: 4,
    description: 'Tetrahedron – perfect for quick damage rolls.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #FDBA74, #F97316)',
    shape: 'tetra',
    iconSvg: '/D4DieIcon.svg?v=3',
    dieSvg: '/D4Die.svg?v=2'
  },
  {
    label: 'd6',
    faces: 6,
    description: 'Classic cube for most tabletop games.',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #6EE7B7, #22C55E)',
    shape: 'cube',
    iconSvg: '/D6DieIcon.svg?v=3',
    dieSvg: '/D6Die.svg?v=2'
  },
  {
    label: 'd8',
    faces: 8,
    description: 'Great for spells and mid-tier damage.',
    color: '#0EA5E9',
    gradient: 'linear-gradient(135deg, #7DD3FC, #0EA5E9)',
    shape: 'octa',
    iconSvg: '/D8DieIcon.svg?v=3',
    dieSvg: '/D8Die.svg?v=2'
  },
  {
    label: 'd10',
    faces: 10,
    description: 'Used for percentage checks and ranged attacks.',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #C4B5FD, #6366F1)',
    shape: 'pentagonal',
    iconSvg: '/D10DieIcon.svg?v=3',
    dieSvg: '/D10Die.svg?v=2'
  },
  {
    label: 'd12',
    faces: 12,
    description: 'Heavy hitters and unique class abilities.',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #F9A8D4, #EC4899)',
    shape: 'dodeca',
    iconSvg: '/D12DieIcon.svg?v=3',
    dieSvg: '/D12Die.svg?v=2'
  },
  {
    label: 'd20',
    faces: 20,
    description: 'Checks, saves, and critical moments.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #FDE68A, #EA580C)',
    shape: 'icosa',
    iconSvg: '/D20DieIcon.svg?v=3',
    dieSvg: '/D20Die.svg?v=2'
  }
];

export const DEFAULT_DICE = diceTypes[1];

export default diceTypes;

