import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Subject, Medium, NoteWithRelations } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Subjects } from '@/components/Subjects';
import { NotesList } from '@/components/NotesList';
import { NoteReader } from '@/components/NoteReader';
import { Footer } from '@/components/Footer';
import { AuthModal } from '@/components/AuthModal';

export default function App() {
  const { user, signIn, signUp, signOut } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mediums, setMediums] = useState<Medium[]>([]);
  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedClass, setSelectedClass] = useState<number>(11);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedMedium, setSelectedMedium] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<NoteWithRelations | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    async function loadData() {
      try {
        const [subjectsRes, mediumsRes, notesRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name'),
          supabase.from('mediums').select('*').order('name'),
          supabase
            .from('notes')
            .select('*, subjects(id, name, icon, color), mediums(id, name, code)')
            .order('created_at', { ascending: false }),
        ]);

        if (subjectsRes.error) throw subjectsRes.error;
        if (mediumsRes.error) throw mediumsRes.error;
        if (notesRes.error) throw notesRes.error;

        setSubjects(subjectsRes.data as Subject[]);
        setMediums(mediumsRes.data as Medium[]);
        setNotes((notesRes.data as NoteWithRelations[]) ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const noteCounts = notes.reduce<Record<string, number>>((acc, note) => {
    if (note.subject_id) {
      acc[note.subject_id] = (acc[note.subject_id] ?? 0) + 1;
    }
    return acc;
  }, {});

  const scrollToSection = useCallback((section: string) => {
    const el = document.getElementById(section);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleSubjectClick = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setTimeout(() => scrollToSection('notes'), 100);
  }, [scrollToSection]);

  const handleSubjectClear = useCallback(() => {
    setSelectedSubject(null);
  }, []);

  const handleNoteClick = useCallback(async (note: NoteWithRelations) => {
    setActiveNote(note);
    try {
      await supabase
        .from('notes')
        .update({ downloads: note.downloads + 1 })
        .eq('id', note.id);
    } catch {
      // non-critical
    }
  }, []);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    await signIn(email, password);
  }, [signIn]);

  const handleSignUp = useCallback(async (email: string, password: string) => {
    await signUp(email, password);
  }, [signUp]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center animate-pulse">
            <span className="text-2xl">📚</span>
          </div>
          <p className="text-slate-400 font-medium">Loading study material...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        mediums={mediums}
        selectedMedium={selectedMedium}
        onMediumChange={setSelectedMedium}
        onNavigate={scrollToSection}
        userEmail={user?.email ?? null}
        onSignInClick={() => { setAuthMode('signin'); setAuthOpen(true); }}
        onSignOut={handleSignOut}
      />

      <main>
        <Hero
          noteCount={notes.length}
          subjectCount={subjects.length / 2}
          mediumCount={mediums.length}
          onExplore={() => scrollToSection('subjects')}
          onBrowseNotes={() => scrollToSection('notes')}
        />

        <Subjects
          subjects={subjects}
          selectedClass={selectedClass}
          onClassChange={setSelectedClass}
          onSubjectClick={handleSubjectClick}
          noteCounts={noteCounts}
        />

        <NotesList
          notes={notes}
          subjects={subjects}
          mediums={mediums}
          selectedClass={selectedClass}
          onClassChange={setSelectedClass}
          selectedSubject={selectedSubject}
          onSubjectClear={handleSubjectClear}
          selectedMedium={selectedMedium}
          onMediumChange={setSelectedMedium}
          onNoteClick={handleNoteClick}
        />
      </main>

      <Footer onNavigate={scrollToSection} />

      <NoteReader note={activeNote} onClose={() => setActiveNote(null)} />

      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onSwitchMode={setAuthMode}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />
    </div>
  );
}
