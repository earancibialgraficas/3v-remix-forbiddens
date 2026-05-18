import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MultiplayerSharedMusicPlayer from '@/components/MultiplayerSharedMusicPlayer';

vi.mock('@/integrations/supabase/client', () => {
  const channel = {
    presenceState: () => ({}),
    on: () => channel,
    subscribe: (cb: any) => {
      if (typeof cb === 'function') cb('SUBSCRIBED');
      return Promise.resolve();
    },
    track: () => Promise.resolve(),
    send: () => Promise.resolve(),
  };
  return { supabase: { channel: () => channel, removeChannel: async () => {} } };
});

describe('MultiplayerSharedMusicPlayer', () => {
  it('preserva la canción al cambiar de sala', async () => {
    render(<MultiplayerSharedMusicPlayer gameId="g1" roomCode="r1" userName="tester" />);

    const urlInput = screen.getByPlaceholderText(/URL YouTube\/mp3\/ogg/i);
    const titleInput = screen.getByPlaceholderText(/Titulo/i);
    const addButton = screen.getByRole('button', { name: /Agregar/i });

    fireEvent.change(titleInput, { target: { value: 'Mi Canción' } });
    fireEvent.change(urlInput, { target: { value: 'https://example.com/song.mp3' } });
    fireEvent.click(addButton);

    await waitFor(() => expect(screen.getByText('Mi Canción')).toBeInTheDocument());

    const select = screen.getByLabelText(/Sala de musica/i);
    fireEvent.change(select, { target: { value: 'shared-1' } });

    expect(screen.getByText('Mi Canción')).toBeInTheDocument();
  });
});
