const diceTypes = [
  {
    label: 'd4',
    faces: 4,
    description: 'Tetrahedron – perfect for quick damage rolls.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #FDBA74, #F97316)',
    shape: 'tetra'
  },
  {
    label: 'd6',
    faces: 6,
    description: 'Classic cube for most tabletop games.',
    color: '#22C55E',
    gradient: 'linear-gradient(135deg, #6EE7B7, #22C55E)',
    shape: 'cube'
  },
  {
    label: 'd8',
    faces: 8,
    description: 'Great for spells and mid-tier damage.',
    color: '#0EA5E9',
    gradient: 'linear-gradient(135deg, #7DD3FC, #0EA5E9)',
    shape: 'octa'
  },
  {
    label: 'd10',
    faces: 10,
    description: 'Used for percentage checks and ranged attacks.',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #C4B5FD, #6366F1)',
    shape: 'pentagonal'
  },
  {
    label: 'd12',
    faces: 12,
    description: 'Heavy hitters and unique class abilities.',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #F9A8D4, #EC4899)',
    shape: 'dodeca'
  },
  {
    label: 'd20',
    faces: 20,
    description: 'Checks, saves, and critical moments.',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #FDE68A, #EA580C)',
    shape: 'icosa'
  }
];

export const DEFAULT_DICE = diceTypes[1];

export default diceTypes;

