import api from "../api/axios";

const teamService = {
  // Create a new team
  createTeam: (data) => api.post("/teams", data),

  // Get user's teams
  getMyTeams: () => api.get("/teams/my-teams"),

  // Get team by ID
  getTeam: (teamId) => api.get(`/teams/${teamId}`),

  // Join team with invite code
  joinTeam: (inviteCode) => api.post("/teams/join", { inviteCode }),

  // Invite member to team
  inviteMember: (teamId, email) => api.post(`/teams/${teamId}/invite`, { email }),

  // Complete team registration
  completeTeamRegistration: (teamId) =>
    api.post(`/teams/${teamId}/complete-registration`),

  // Leave team
  leaveTeam: (teamId) => api.delete(`/teams/${teamId}/leave`),
};

export default teamService;
