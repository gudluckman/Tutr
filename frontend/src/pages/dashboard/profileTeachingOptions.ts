export type SubjectGroup = {
  label: string;
  subjects: string[];
};

export const teachingYearOptions = [
  'Year 1-6',
  'Year 7',
  'Year 8',
  'Year 9',
  'Year 10',
  'Year 11',
  'Year 12',
];

const primarySubjectGroups: SubjectGroup[] = [
  { label: 'Primary subjects', subjects: ['English', 'Mathematics', 'Science and Technology', 'Human Society and its Environment (HSIE)', 'Creative Arts', 'Personal Development, Health and Physical Education (PDHPE)'] },
];

const juniorSubjectGroups: SubjectGroup[] = [
  { label: 'All Languages', subjects: ['Aboriginal languages', 'Arabic', 'Chinese', 'Classical Greek', 'French', 'German', 'Hebrew', 'Indonesian', 'Italian', 'Japanese', 'Korean', 'Latin', 'Modern Greek', 'Russian', 'Spanish', 'Turkish', 'Vietnamese', 'Macedonian', 'Persian', 'Punjabi', 'Tamil', 'Hindi'] },
  { label: 'All Humanities', subjects: ['Aboriginal Studies', 'Geography', 'History', 'History Elective'] },
  { label: 'All Vocational', subjects: ['Agriculture/Agricultural Technology', 'Child Studies', 'Food Technology', 'Marine & Aquaculture Technology', 'Technical Drawing', 'Textiles & Design (Textiles Technology)'] },
  { label: 'All Business', subjects: ['Commerce', 'Work Education'] },
  { label: 'All Arts', subjects: ['Dance', 'Design & Technology', 'Drama', 'Graphics Technology', 'Music', 'Photography & Digital Media', 'Visual Arts', 'Visual Design'] },
  { label: 'All English', subjects: ['English'] },
  { label: 'All Technology', subjects: ['Industrial Technology', 'Information & Software Technology', 'Technics', 'Technology (Mandatory)', 'Agricultural Technology', 'Design & Technology', 'Food Technology', 'Graphics Technology', 'Textiles Technology', 'Marine & Aquaculture Technology'] },
  { label: 'All Maths', subjects: ['Mathematics'] },
  { label: 'All Life Skills', subjects: ['PDHPE', 'Physical Activity & Sports Studies'] },
  { label: 'All Science', subjects: ['Science'] },
];

const seniorSubjectGroups: SubjectGroup[] = [
  { label: 'All English', subjects: ['English', 'English Extension 1', 'English Extension 2', 'English EAL/D', 'Fundamentals of English', 'English Studies', 'English Life Skills'] },
  { label: 'All Maths', subjects: ['Mathematics Standard', 'Mathematics Advanced', 'Mathematics Extension 1', 'Mathematics Extension 2', 'SAT (American College Admissions Test)', 'Mathematics Life Skills'] },
  { label: 'All Science', subjects: ['Biology', 'Chemistry', 'Earth & Environmental Science', 'Physics', 'Senior Science', 'UCAT (University Clinical Aptitude Test)', 'Investigating Science', 'Science Extension'] },
  { label: 'All Humanities', subjects: ['Aboriginal Studies', 'Ancient History', 'Geography', 'History Extension', 'Modern History', 'Society & Culture', 'Studies Of Religion'] },
  { label: 'All Business', subjects: ['Business Studies', 'Economics', 'Legal Studies', 'Work Studies'] },
  { label: 'All PDHPE', subjects: ['Community & Family Studies', 'Personal Development, Health & Physical Education', 'Exploring Early Childhood', 'Sport, Lifestyle & Recreation Studies'] },
  { label: 'All Arts', subjects: ['Dance', 'Drama', 'Music 1', 'Music 2', 'Music Extension', 'Visual Arts', 'Ceramics', 'Photography, Video & Digital Imaging', 'Visual Design'] },
  { label: 'All Languages', subjects: ['Arabic Beginners', 'Arabic Continuers', 'Arabic Extension', 'Armenian Continuers', 'Chinese Beginners', 'Chinese Continuers', 'Chinese Extension', 'Chinese and Literature', 'Classical Greek Continuers', 'Classical Greek Extension', 'Classical Hebrew Continuers', 'Classical Hebrew Extension', 'Croation Continuers', 'Dutch Continuers', 'Filipino Continuers', 'French Beginners', 'French Continuers', 'French Extension', 'German Beginners', 'German Continuers', 'German Extension', 'Chinese in Context', 'Heritage Indonesian', 'Japanese in Context', 'Korean in Context', 'Hindi Continuers', 'Hungarian Continuers', 'Indonesian Beginners', 'Indonesian Continuers', 'Indonesian Extension', 'Indonesian and Literature', 'Italian Beginners', 'Italian Continuers', 'Italian Extension', 'Japanese Beginners', 'Japanese Continuers', 'Japanese Extension', 'Japanese and Literature', 'Khmer Continuers', 'Korean Continuers', 'Korean and Literature', 'Latin Continuers', 'Latin Extension', 'Macedonian Continuers', 'Malay Background Speakers', 'Maltese Continuers', 'Modern Greek Beginners', 'Modern Greek Continuers', 'Modern Greek Extension', 'Modern Hebrew Continuers', 'Persian Background Speakers', 'Polish Continuers', 'Punjabi Continuers', 'Russian Background Speakers', 'Russian Continuers', 'Serbian Continuers', 'Spanish Beginners', 'Spanish Continuers', 'Spanish Extension', 'Swedish Continuers', 'Tamil Continuers', 'Turkish Continuers', 'Ukranian Continuers', 'Vietnamese Continuers', 'Portugese Continuers', 'Persian Continuers', 'Korean Beginners'] },
  { label: 'All Vocational', subjects: ['Automotive', 'Business Services', 'Construction', 'Electrotechnology', 'Entertainment Industry', 'Financial Services', 'Hospitality', 'Human Services', 'Metal & Engineering', 'Primary Industries', 'Retail Services', 'Tourism & Events', 'Tourism, Travel & Events', 'Information & Digital Technology'] },
  { label: 'All Technology', subjects: ['Information Processes & Technology', 'Computing Applications', 'Marine Studies', 'Engineering Studies', 'Agriculture', 'Industrial Technology', 'Software Design & Development', 'Textiles & Design'] },
  { label: 'All Life Skills', subjects: ['Dance Life Skills', 'Drama Life Skills', 'Music Life Skills', 'Visual Arts Life Skills', 'Community & Family Studies Life Skills', 'English Life Skills', 'Aboriginal Studies Life Skills', 'Business & Economics Life Skills', 'Citizenship & Legal Studies Life Skills', 'Geography Life Skills', 'Modern History Life Skills', 'Society & Culture Life Skills', 'Studies of Religion 1 Life Skills', 'Studies of Religion 2 Life Skills', 'Mathematics Life Skills', 'Personal Development, Health & Physical Education Life Skills', 'Science Life Skills', 'Agriculture Life Skills', 'Design & Technology Life Skills', 'Food Technology Life Skills', 'Industrial Technology Life Skills', 'Information Processes & Technology Life Skills', 'Textiles & Design Life Skills', 'Work & The Community Life Skills'] },
];

export function subjectGroupsForYear(year: string) {
  if (['Year 11', 'Year 12'].includes(year)) return seniorSubjectGroups;
  if (['Year 7', 'Year 8', 'Year 9', 'Year 10'].includes(year)) return juniorSubjectGroups;
  return primarySubjectGroups;
}
