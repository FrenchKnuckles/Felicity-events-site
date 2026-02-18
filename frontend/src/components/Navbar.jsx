import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Box, Flex, Text, Button, Badge, IconButton, Tooltip } from "@radix-ui/themes";
import { HamburgerMenuIcon, Cross1Icon, ExitIcon, PersonIcon, SunIcon, MoonIcon } from "@radix-ui/react-icons";
import { useState } from "react";

const Navbar = () => {
  const { user, logout, loading } = useAuth();
  const { appearance, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getNavLinks = () => {
    if (!user) {
      return [];
    }

    switch (user.role) {
      case "admin":
        return [
          { to: "/admin/dashboard", label: "Dashboard" },
          { to: "/admin/organizers", label: "Manage Clubs" },
          { to: "/admin/password-requests", label: "Reset Requests" },
        ];

      case "organizer":
        return [
          { to: "/organizer/dashboard", label: "Dashboard" },
          { to: "/organizer/events/create", label: "Create Event" },
          { to: "/organizer/ongoing", label: "Ongoing Events" },
          { to: "/organizer/profile", label: "Profile" },
        ];

      default:
        return [
          { to: "/dashboard", label: "Dashboard" },
          { to: "/events", label: "Browse Events" },
          { to: "/organizers", label: "Clubs/Organizers" },
          { to: "/profile", label: "Profile" },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <Box style={{ 
      background: "var(--color-background)", 
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)", 
      borderBottom: "1px solid var(--gray-4)",
      position: "sticky",
      top: 0,
      zIndex: 50 
    }}>
      <Box style={{ maxWidth: 1280, margin: "0 auto" }} px="4">
        <Flex justify="between" align="center" style={{ height: 64 }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: "none" }}>
            <Text size="6" weight="bold" style={{ background: "linear-gradient(90deg, var(--indigo-11), var(--violet-11))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Felicity
            </Text>
          </Link>

          {/* Desktop Navigation */}
          <Flex gap="1" className="desktop-nav">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: "var(--radius-2)", 
                  color: "var(--gray-11)",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: 14
                }}
              >
                {link.label}
              </Link>
            ))}
          </Flex>

          {/* User Menu - Desktop */}
          <Flex gap="4" align="center" className="desktop-nav">
            <Tooltip content={appearance === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton variant="ghost" onClick={toggleTheme} style={{ cursor: "pointer" }}>
                {appearance === "dark" ? <SunIcon width="18" height="18" /> : <MoonIcon width="18" height="18" />}
              </IconButton>
            </Tooltip>
            {user ? (
              <>
                <Flex align="center" gap="2">
                  <PersonIcon />
                  <Text weight="medium">{user.firstName}</Text>
                  <Badge color="indigo" size="1">{user.role}</Badge>
                </Flex>
                <Button variant="soft" color="red" onClick={handleLogout}>
                  <ExitIcon />
                  Logout
                </Button>
              </>
            ) : (
              <Flex gap="2">
                <Button variant="soft" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Register</Link>
                </Button>
              </Flex>
            )}
          </Flex>

          {/* Mobile menu button */}
          <Box className="mobile-only">
            <IconButton
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <Cross1Icon /> : <HamburgerMenuIcon />}
            </IconButton>
          </Box>
        </Flex>
      </Box>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <Box style={{ borderTop: "1px solid var(--gray-4)", background: "var(--color-background)" }} className="mobile-only">
          <Flex direction="column" gap="1" p="3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: "var(--radius-2)", 
                  color: "var(--gray-11)",
                  textDecoration: "none",
                  display: "block"
                }}
              >
                {link.label}
              </Link>
            ))}
            <IconButton variant="ghost" onClick={toggleTheme} style={{ cursor: "pointer", alignSelf: "flex-start", marginTop: 4 }}>
              {appearance === "dark" ? <SunIcon width="18" height="18" /> : <MoonIcon width="18" height="18" />}
            </IconButton>
            {user && (
              <Button variant="soft" color="red" onClick={handleLogout} style={{ marginTop: 8 }}>
                <ExitIcon />
                Logout
              </Button>
            )}
          </Flex>
        </Box>
      )}
    </Box>
  );
};

export default Navbar;