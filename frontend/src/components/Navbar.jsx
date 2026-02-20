import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Box, Flex, Text, Button, Badge, IconButton, Tooltip } from "@radix-ui/themes";
import { HamburgerMenuIcon, Cross1Icon, ExitIcon, PersonIcon, SunIcon, MoonIcon } from "@radix-ui/react-icons";
import { useState } from "react";

const navMap = {
  admin: [{ to: "/admin/dashboard", label: "Dashboard" }, { to: "/admin/organizers", label: "Manage Clubs" }, { to: "/admin/password-requests", label: "Reset Requests" }],
  organizer: [{ to: "/organizer/dashboard", label: "Dashboard" }, { to: "/organizer/events/create", label: "Create Event" }, { to: "/organizer/ongoing", label: "Ongoing Events" }, { to: "/organizer/profile", label: "Profile" }],
  participant: [{ to: "/dashboard", label: "Dashboard" }, { to: "/events", label: "Browse Events" }, { to: "/organizers", label: "Clubs/Organizers" }, { to: "/profile", label: "Profile" }],
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { appearance, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = user ? (navMap[user.role] || navMap.participant) : [];
  const doLogout = () => { logout(); navigate("/login"); };

  const linkStyle = { padding: "8px 16px", borderRadius: "var(--radius-2)", color: "var(--gray-11)", textDecoration: "none", fontWeight: 500, fontSize: 14 };
  const ThemeBtn = () => <Tooltip content={appearance === "dark" ? "Switch to light mode" : "Switch to dark mode"}><IconButton variant="ghost" onClick={toggleTheme} style={{ cursor: "pointer" }}>{appearance === "dark" ? <SunIcon width="18" height="18" /> : <MoonIcon width="18" height="18" />}</IconButton></Tooltip>;

  return (
    <Box style={{ background: "var(--color-background)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderBottom: "1px solid var(--gray-4)", position: "sticky", top: 0, zIndex: 50 }}>
      <Box style={{ maxWidth: 1280, margin: "0 auto" }} px="4">
        <Flex justify="between" align="center" style={{ height: 64 }}>
          {user ? <Text size="6" weight="bold" style={{ background: "linear-gradient(90deg, var(--indigo-11), var(--violet-11))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Felicity</Text> : <Link to="/" style={{ textDecoration: "none" }}><Text size="6" weight="bold" style={{ background: "linear-gradient(90deg, var(--indigo-11), var(--violet-11))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Felicity</Text></Link>}
          <Flex gap="1" className="desktop-nav">{links.map(l => <Link key={l.to} to={l.to} style={linkStyle}>{l.label}</Link>)}</Flex>
          <Flex gap="4" align="center" className="desktop-nav">
            <ThemeBtn />
            {user ? <><Flex align="center" gap="2"><PersonIcon /><Text weight="medium">{user.firstName}</Text><Badge color="indigo" size="1">{user.role}</Badge></Flex><Button variant="soft" color="red" onClick={doLogout}><ExitIcon />Logout</Button></>
            : <Flex gap="2"><Button variant="soft" asChild><Link to="/login">Login</Link></Button><Button asChild><Link to="/register">Register</Link></Button></Flex>}
          </Flex>
          <Box className="mobile-only"><IconButton variant="ghost" onClick={() => setOpen(!open)}>{open ? <Cross1Icon /> : <HamburgerMenuIcon />}</IconButton></Box>
        </Flex>
      </Box>
      {open && <Box style={{ borderTop: "1px solid var(--gray-4)", background: "var(--color-background)" }} className="mobile-only"><Flex direction="column" gap="1" p="3">
        {links.map(l => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} style={{ ...linkStyle, display: "block" }}>{l.label}</Link>)}
        <ThemeBtn />
        {user && <Button variant="soft" color="red" onClick={doLogout} style={{ marginTop: 8 }}><ExitIcon />Logout</Button>}
      </Flex></Box>}
    </Box>
  );
};

export default Navbar;
