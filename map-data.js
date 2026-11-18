// Fictional, deterministic participants. These are never live locations.
export const crowdGroups=[
 {id:'ai-lounge',topic:'ai',x:62,y:35,count:13,place:'Conversation lounge',shade:'#777777',color:'#6B8FD6'},
 {id:'health-corner',topic:'health',x:32,y:52,count:11,place:'Coffee corner',shade:'#989898',color:'#75A98C'},
 {id:'design-studio',topic:'design',x:72,y:68,count:9,place:'Shared tables',shade:'#b2b2b2',color:'#B18BC8'},
 {id:'access-lounge',topic:'access',x:28,y:25,count:8,place:'Quiet lounge',shade:'#838383',color:'#D497B1'},
 {id:'social-space',topic:'social',x:54,y:79,count:7,place:'Community space',shade:'#aaaaaa',color:'#D7AB65'},
 {id:'education',topic:'learning',x:77,y:17,count:6,place:'Learning corner',shade:'#929292',color:'#7DAEB9'},
 {id:'physical-lab',topic:'physical',x:18,y:73,count:5,place:'Hands-on tables',shade:'#bdbdbd',color:'#C6876D'},
 {id:'privacy-chat',topic:'privacy',x:77,y:49,count:6,place:'Research exchange',shade:'#686868',color:'#8E91BC'},
];
const names=['Avery','Jamie','Morgan','Sam','Taylor','Robin','Casey','Jordan','Riley','Cameron','Drew','Quinn'];
const surnames=['Chen','Lee','Patel','Rivera','Park','Kim','Taylor','Reed','Morgan','Singh','Wang','Brown'];
export const demoPeople=crowdGroups.flatMap((group,g)=>Array.from({length:group.count},(_,i)=>{const angle=i*2.399963;const radius=1.7+Math.sqrt(i)*1.65;return {id:`person-${g}-${i}`,name:`${names[(i+g*2)%names.length]} ${surnames[(i*3+g)%surnames.length]}`,role:['Researcher','Designer','PhD student'][i%3],topic:group.topic,secondary:['access','ai','design','social'].filter(id=>id!==group.topic)[(i+g)%(['access','ai','design','social'].includes(group.topic)?3:4)],personalInterests:[['coffee','outdoors'],['arts','making'],['play','food'],['wellness','city']][i%4],group:group.id,place:group.place,x:group.x+Math.cos(angle)*radius,y:group.y+Math.sin(angle)*radius*.6,shade:group.shade,color:group.color,open:i%5!==0};}));
export function filterMapPeople(people,filters,profile){if(!filters.people)return [];return people.filter(person=>(filters.domain==='all'||person.topic===filters.domain)&&(!filters.shared||[...(profile.topics||[]),...(profile.secondaryInterests||[])].some(id=>[person.topic,person.secondary].includes(id))||(person.personalInterests||[]).some(id=>(profile.personalInterests||[]).includes(id))));}
