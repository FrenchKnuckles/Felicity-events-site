import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import { organizerService } from "../../services";
import { toast } from "react-toastify";
import { Box, Card, Flex, Text, Heading, Badge, Grid, Button, TextField, Avatar } from "@radix-ui/themes";
import {
  PersonIcon,
  EnvelopeClosedIcon,
  MobileIcon,
  HomeIcon,
  Pencil1Icon,
  CheckIcon,
  Cross2Icon,
  LockClosedIcon,
  HeartIcon,
  StarIcon,
} from "@radix-ui/react-icons";

const AREAS_OF_INTEREST = [
  "Competitive Programming",
  "Web Development",
  "Mobile App Development",
  "Machine Learning & AI",
  "Data Science",
  "Cybersecurity",
  "Cloud Computing",
  "DevOps",
  "Blockchain",
  "IoT",
  "Robotics",
  "Game Development",
  "UI/UX Design",
  "Open Source",
  "Research & Academia",
  "Entrepreneurship",
  "Finance & Trading",
  "Music & Arts",
  "Photography",
  "Dance",
  "Literary Arts",
  "Sports & Fitness",
  "Social Events",
];

const Profile = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unfollowLoading, setUnfollowLoading] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    collegeOrg: "",
    areasOfInterest: [],
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Fetch fresh user data to get populated followedOrganizers
    refreshUser();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        contactNumber: user.contactNumber || "",
        collegeOrg: user.collegeOrg || "",
        areasOfInterest: user.areasOfInterest || [],
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleInterest = (interest) => {
    setFormData((prev) => ({
      ...prev,
      areasOfInterest: prev.areasOfInterest.includes(interest)
        ? prev.areasOfInterest.filter((i) => i !== interest)
        : [...prev.areasOfInterest, interest],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put("/auth/profile", formData);
      updateUser(data.user);
      toast.success("Profile updated successfully!");
      setEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.put("/auth/password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success("Password changed successfully!");
      setChangingPassword(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (orgId) => {
    setUnfollowLoading(orgId);
    try {
      const { followedOrganizers } = await organizerService.toggleFollow(orgId);
      updateUser({ followedOrganizers });
      toast.success("Unfollowed successfully");
    } catch (error) {
      toast.error("Failed to unfollow");
    } finally {
      setUnfollowLoading(null);
    }
  };

  return (
    <Box p="6" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <Box mb="6">
        <Heading size="7" weight="bold">My Profile</Heading>
        <Text as="p" size="3" color="gray" mt="2">Manage your account settings and preferences</Text>
      </Box>

      <Grid columns={{ initial: "1", lg: "3" }} gap="6">
        {/* Main Profile */}
        <Box style={{ gridColumn: "span 2" }}>
          <Flex direction="column" gap="5">
            {/* Profile Info Card */}
            <Card>
              <Flex align="center" justify="between" mb="5">
                <Heading size="5">Personal Information</Heading>
                {!editing ? (
                  <Button variant="ghost" onClick={() => setEditing(true)}>
                    <Pencil1Icon width={16} height={16} />
                    Edit
                  </Button>
                ) : (
                  <Button variant="ghost" color="gray" onClick={() => setEditing(false)}>
                    <Cross2Icon width={16} height={16} />
                    Cancel
                  </Button>
                )}
              </Flex>

              <form onSubmit={handleSubmit}>
                <Grid columns={{ initial: "1", md: "2" }} gap="5">
                  <Box>
                    <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                      <Flex align="center" gap="1">
                        <PersonIcon width={14} height={14} />
                        First Name
                      </Flex>
                    </Text>
                    {editing ? (
                      <TextField.Root
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    ) : (
                      <Text as="p" weight="medium">{user?.firstName}</Text>
                    )}
                  </Box>

                  <Box>
                    <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                      Last Name
                    </Text>
                    {editing ? (
                      <TextField.Root
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    ) : (
                      <Text as="p" weight="medium">{user?.lastName}</Text>
                    )}
                  </Box>

                  <Box>
                    <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                      <Flex align="center" gap="1">
                        <EnvelopeClosedIcon width={14} height={14} />
                        Email
                      </Flex>
                    </Text>
                    <Text as="p" weight="medium">{user?.email}</Text>
                    <Text as="p" size="1" color="gray" mt="1">Email cannot be changed</Text>
                  </Box>

                  <Box>
                    <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                      <Flex align="center" gap="1">
                        <MobileIcon width={14} height={14} />
                        Contact Number
                      </Flex>
                    </Text>
                    {editing ? (
                      <TextField.Root
                        type="tel"
                        name="contactNumber"
                        value={formData.contactNumber}
                        onChange={handleChange}
                      />
                    ) : (
                      <Text as="p" weight="medium">
                        {user?.contactNumber || "Not provided"}
                      </Text>
                    )}
                  </Box>

                  <Box style={{ gridColumn: "span 2" }}>
                    <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                      <Flex align="center" gap="1">
                        <HomeIcon width={14} height={14} />
                        College / Organization
                      </Flex>
                    </Text>
                    {editing ? (
                      <TextField.Root
                        name="collegeOrg"
                        value={formData.collegeOrg}
                        onChange={handleChange}
                      />
                    ) : (
                      <Text as="p" weight="medium">
                        {user?.collegeOrg || "Not provided"}
                      </Text>
                    )}
                  </Box>
                </Grid>

                {editing && (
                  <Flex justify="end" mt="5">
                    <Button type="submit" disabled={loading}>
                      <CheckIcon width={16} height={16} />
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </Flex>
                )}
              </form>
            </Card>

            {/* Interests Card */}
            <Card>
              <Flex align="center" justify="between" mb="5">
                <Flex align="center" gap="2">
                  <StarIcon width={20} height={20} color="var(--yellow-9)" />
                  <Heading size="5">Areas of Interest</Heading>
                </Flex>
              </Flex>

              <Text as="p" color="gray" mb="4">
                Select your interests to get personalized event recommendations
              </Text>

              <Flex wrap="wrap" gap="2">
                {AREAS_OF_INTEREST.map((interest) => (
                  <Button
                    key={interest}
                    variant={formData.areasOfInterest.includes(interest) ? "solid" : "outline"}
                    size="1"
                    onClick={() => toggleInterest(interest)}
                    style={{ borderRadius: 9999 }}
                  >
                    {interest}
                  </Button>
                ))}
              </Flex>

              {JSON.stringify(formData.areasOfInterest) !== JSON.stringify(user?.areasOfInterest) && (
                <Flex justify="end" mt="5">
                  <Button onClick={handleSubmit} disabled={loading}>
                    <CheckIcon width={16} height={16} />
                    {loading ? "Saving..." : "Save Interests"}
                  </Button>
                </Flex>
              )}
            </Card>

            {/* Password Change Card */}
            <Card>
              <Flex align="center" justify="between" mb="5">
                <Flex align="center" gap="2">
                  <LockClosedIcon width={20} height={20} color="var(--gray-8)" />
                  <Heading size="5">Password</Heading>
                </Flex>
                {!changingPassword ? (
                  <Button variant="ghost" onClick={() => setChangingPassword(true)}>
                    Change Password
                  </Button>
                ) : (
                  <Button variant="ghost" color="gray" onClick={() => setChangingPassword(false)}>
                    Cancel
                  </Button>
                )}
              </Flex>

              {changingPassword && (
                <form onSubmit={handlePasswordChange}>
                  <Flex direction="column" gap="4">
                    <Box>
                      <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                        Current Password
                      </Text>
                      <TextField.Root
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                        }
                        required
                      />
                    </Box>
                    <Box>
                      <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                        New Password
                      </Text>
                      <TextField.Root
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                        required
                        minLength={6}
                      />
                    </Box>
                    <Box>
                      <Text as="label" size="2" weight="medium" mb="2" style={{ display: "block" }}>
                        Confirm New Password
                      </Text>
                      <TextField.Root
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        required
                      />
                    </Box>
                    <Flex justify="end">
                      <Button type="submit" disabled={loading}>
                        {loading ? "Changing..." : "Change Password"}
                      </Button>
                    </Flex>
                  </Flex>
                </form>
              )}
            </Card>
          </Flex>
        </Box>

        {/* Sidebar */}
        <Flex direction="column" gap="5">
          {/* Profile Summary Card */}
          <Card style={{ textAlign: "center" }}>
            <Box
              style={{
                width: 96,
                height: 96,
                background: "linear-gradient(135deg, var(--blue-9), var(--purple-9))",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Text size="7" weight="bold" style={{ color: "white" }}>
                {user?.firstName?.charAt(0)}
                {user?.lastName?.charAt(0)}
              </Text>
            </Box>
            <Heading size="4">
              {user?.firstName} {user?.lastName}
            </Heading>
            <Text as="p" color="gray">{user?.email}</Text>
            <Box mt="4">
              <Badge color={user?.participantType === "iiit" ? "blue" : "green"}>
                {user?.participantType === "iiit" ? "IIIT Participant" : "External Participant"}
              </Badge>
            </Box>
          </Card>

          {/* Following Card */}
          <Card>
            <Flex align="center" gap="2" mb="4">
              <HeartIcon width={18} height={18} color="var(--red-9)" />
              <Heading size="4">Following</Heading>
            </Flex>
            {user?.followedOrganizers?.length > 0 ? (
              <Flex direction="column" gap="3">
                {user.followedOrganizers.map((org) => (
                  <Flex key={org._id} align="center" gap="3">
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: "var(--blue-3)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Text size="2" weight="medium" color="blue">
                        {org.name?.charAt(0)}
                      </Text>
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Text as="p" size="2" weight="medium">{org.name}</Text>
                      <Text as="p" size="1" color="gray">{org.category}</Text>
                    </Box>
                    <Button
                      variant="ghost"
                      color="red"
                      size="1"
                      disabled={unfollowLoading === org._id}
                      onClick={() => handleUnfollow(org._id)}
                      title="Unfollow"
                    >
                      <Cross2Icon width={14} height={14} />
                    </Button>
                  </Flex>
                ))}
              </Flex>
            ) : (
              <Text as="p" size="2" color="gray">Not following any organizers yet</Text>
            )}
          </Card>
        </Flex>
      </Grid>
    </Box>
  );
};

export default Profile;
