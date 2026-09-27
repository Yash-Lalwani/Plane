import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Activity, BarChart3, CheckCircle2, CircleUserRound, FileText, FolderKanban, ListChecks, LockKeyhole, MessageSquareText, Paperclip, ShieldCheck, Users } from 'lucide-react';
import { Brand } from '@/components/plane/brand';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Plane — Projects, people, and progress',
  description: 'Explore the Plane project management backend, its implemented features, permissions, and a guided way to test the live API.',
};

const capabilities = [
  {
    icon: FolderKanban,
    number: '01',
    title: 'Project spaces',
    text: 'Create a project, describe its purpose, and keep tasks, notes, members, and activity together. Projects are private to their members.',
    details: ['Create, update, and delete projects', 'Project-scoped data and membership'],
  },
  {
    icon: ListChecks,
    number: '02',
    title: 'Tasks that move',
    text: 'Give work a status, priority, due date, and assignee. Search, filter, sort, and track it as it moves from to do through done.',
    details: ['Subtask checklists', 'Assignees and due dates', 'Search, filters, and pagination'],
  },
  {
    icon: Users,
    number: '03',
    title: 'Invitations and roles',
    text: 'Invite people by email and assign a project role. Admins, Project Admins, and Members have distinct permissions enforced by the server.',
    details: ['Invite, accept, or revoke', 'Manage members and roles'],
  },
  {
    icon: MessageSquareText,
    number: '04',
    title: 'Conversations in context',
    text: 'Discuss a task where the work lives. Members can comment, authors can edit their own comments, and Admins can moderate them.',
    details: ['Task comments', 'Project notes', 'Task attachments'],
  },
  {
    icon: BarChart3,
    number: '05',
    title: 'A clear project picture',
    text: 'See task counts by status and priority, overdue work, and the open workload by teammate. Follow project changes in the activity feed.',
    details: ['Dashboard summaries', 'Paginated activity history'],
  },
  {
    icon: LockKeyhole,
    number: '06',
    title: 'Account essentials',
    text: 'Register, verify an email address, sign in, reset or change a password, and update a profile and avatar. Unverified accounts cannot access projects.',
    details: ['Cookie-based sessions', 'Email verification and recovery'],
  },
];

const testSteps = [
  {
    number: '01',
    title: 'Start with the seeded Admin',
    body: 'Sign in as demo@plane.dev. Open Website Relaunch and inspect its tasks, subtasks, comments, notes, dashboard, members, and activity. The account is already verified.',
  },
  {
    number: '02',
    title: 'Take a task from start to done',
    body: 'Create a task, give it a priority and due date, assign it to a project member, add subtasks and a comment, then update its status. Search and filter the task list to find it again.',
  },
  {
    number: '03',
    title: 'Try the different permission levels',
    body: 'With the same demo account, open Mobile App Beta. There it is a Member: it can read tasks, add comments, and complete subtasks, but cannot edit tasks. Alex is the Admin of that project.',
  },
  {
    number: '04',
    title: 'Explore the project lifecycle',
    body: 'Create a separate test project, add a note, review its dashboard and activity, and try its member and invitation actions. Use that test project when checking permanent deletion.',
  },
];

export default function AboutPage() {
  return <div className="about-page">
    <header className="site-header"><nav className="site-nav about-nav" aria-label="Main navigation"><Brand/><div className="nav-links"><Link href="/">Home</Link><Link href="/about" aria-current="page" className="about-nav-active">About</Link><Link href="/#features">Features</Link></div><div className="nav-actions"><Link href="/login" className="login-link">Log in</Link><Button asChild className="black-button"><a href="https://api.plane.yashlalwani.info/api-docs" target="_blank" rel="noopener noreferrer">Explore the API <ArrowUpRight size={15}/></a></Button></div></nav></header>
    <main>
      <section className="about-hero section-wrap"><div className="about-hero-intro"><p className="eyebrow">AN INDEPENDENT PROJECT BY YASH LALWANI</p><h1>Meet Plane.<br/><span>Make progress together.</span></h1><p className="about-lede">Plane is a project management app for small teams. It brings projects, tasks, conversations, notes, and progress into one shared space, with clear permissions for the people doing the work.</p><div className="about-hero-actions"><Button asChild className="black-button large"><a href="https://api.plane.yashlalwani.info/api-docs" target="_blank" rel="noopener noreferrer">Test the live API <ArrowUpRight size={16}/></a></Button><Link href="#try-plane" className="about-inline-link">How to test it <ArrowRight size={16}/></Link></div></div><div className="about-hero-aside"><span className="about-aside-label">BUILT AROUND THE WORK</span><div><CheckCircle2/><span>Plan the next step.</span></div><div><Users/><span>Give everyone a role.</span></div><div><Activity/><span>See the work move.</span></div><p>From a first task to a finished project.</p></div></section>
      <section className="about-capabilities"><div className="section-wrap"><div className="about-section-intro"><p className="eyebrow">WHAT THE BACKEND SUPPORTS</p><h2>The essentials, together.</h2><p>The live API implements each capability below, with access rules where required.</p></div><div className="about-feature-grid">{capabilities.map(({icon:Icon,number,title,text,details})=><article className="about-feature" key={title}><div className="about-feature-head"><span className="about-icon"><Icon size={22}/></span><span>{number} / 06</span></div><h3>{title}</h3><p>{text}</p><ul>{details.map(detail=><li key={detail}><span aria-hidden="true"/> {detail}</li>)}</ul></article>)}</div></div></section>
      <section className="section-wrap about-permissions"><div><p className="eyebrow">PERMISSIONS WITH PURPOSE</p><h2>One project.<br/>Three ways to contribute.</h2><p>Roles belong to a project. Someone can manage one project and participate as a Member in another. The server checks every permission.</p></div><div className="about-role-list"><article><span>01</span><div><h3>Admin</h3><p>Owns the project settings, invitations, membership, notes, and all task management.</p></div><ShieldCheck size={20}/></article><article><span>02</span><div><h3>Project Admin</h3><p>Manages tasks, subtasks, and attachments without changing the project or its membership.</p></div><FolderKanban size={20}/></article><article><span>03</span><div><h3>Member</h3><p>Follows project work, adds comments, and checks off subtasks.</p></div><CircleUserRound size={20}/></article></div></section>
      <section className="about-test" id="try-plane"><div className="section-wrap"><div className="about-section-intro"><p className="eyebrow">FOR REVIEWERS</p><h2>See how Plane works.</h2><p>Use the seeded data to explore, then create your own test project to try changes without disturbing the sample.</p></div><div className="about-test-layout"><div className="about-test-steps">{testSteps.map(step=><article key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></article>)}</div><aside className="about-test-card"><span className="about-aside-label">LIVE API WALKTHROUGH</span><h3>Try it in Swagger</h3><p>The API explorer lets you call the deployed backend directly.</p><ol><li>Open the API documentation.</li><li>Run <code>POST /auth/login</code> with the demo account below.</li><li>Copy <code>accessToken</code> from the response and select <strong>Authorize</strong> under <code>bearerAuth</code>.</li><li>Try the project, task, and collaboration endpoints.</li></ol><div className="about-demo-credentials"><span>SEEDED TEST ACCOUNT</span><div><small>Email</small><code>demo@plane.dev</code></div><div><small>Password</small><code>DemoPass123!</code></div></div><p className="about-test-note">This is a shared test account. Signing in from another device may end an earlier demo session. Invitation and verification emails depend on the configured sender; the seeded account is already verified.</p><Button asChild className="black-button large"><a href="https://api.plane.yashlalwani.info/api-docs" target="_blank" rel="noopener noreferrer">Open API documentation <ArrowUpRight size={16}/></a></Button></aside></div></div></section>
      <section className="about-engineering section-wrap"><div><p className="eyebrow">UNDER THE HOOD</p><h2>Built beyond a prototype.</h2><p>A deployed API backed by PostgreSQL. Project permissions, validation, background emails, file storage, logging, automated tests, and deployment tooling are part of the system.</p></div><div className="about-tech-grid"><span><FolderKanban/>TypeScript + Express</span><span><FileText/>PostgreSQL + Prisma</span><span><LockKeyhole/>JWT cookie sessions</span><span><BarChart3/>Redis dashboard cache</span><span><MessageSquareText/>BullMQ + Resend emails</span><span><Paperclip/>Cloudinary file uploads</span></div></section>
    </main>
    <footer className="about-footer"><div className="section-wrap"><Brand dark/><p>Made to help good work move forward.</p><div><Link href="/">Home <ArrowRight size={15}/></Link><a href="https://api.plane.yashlalwani.info/api-docs" target="_blank" rel="noopener noreferrer">API docs <ArrowUpRight size={15}/></a></div><small>© {new Date().getFullYear()} Plane · Built by Yash Lalwani</small></div></footer>
  </div>
}
