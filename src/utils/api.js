// =============================================
// RockBottom — API Client
// =============================================

const API_BASE = '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// ----- Milestones -----
export const milestones = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/milestones${query ? `?${query}` : ''}`);
  },
  get: (id) => request(`/milestones/${id}`),
  create: (data) => request('/milestones', { method: 'POST', body: data }),
  resolve: (id, data) => request(`/milestones/${id}/resolve`, { method: 'PATCH', body: data }),
};

// ----- Bets -----
export const bets = {
  place: (data) => request('/bets', { method: 'POST', body: data }),
  byUser: (wallet) => request(`/bets/user/${wallet}`),
  byMilestone: (id) => request(`/bets/milestone/${id}`),
};

// ----- Users -----
export const users = {
  connect: (data) => request('/users/connect', { method: 'POST', body: data }),
  get: (wallet) => request(`/users/${wallet}`),
  leaderboard: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/users/leaderboard${query ? `?${query}` : ''}`);
  },
  update: (wallet, data) => request(`/users/${wallet}`, { method: 'PATCH', body: data }),
};

// ----- Proofs -----
export const proofs = {
  submit: async (milestoneId, formData) => {
    const res = await fetch(`${API_BASE}/proofs`, {
      method: 'POST',
      body: formData, // FormData for file upload — no Content-Type header
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  byMilestone: (id) => request(`/proofs/${id}`),
};

export default { milestones, bets, users, proofs };
