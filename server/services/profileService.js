import { prisma } from '../db.js';
import { profileDefaults, publicProfile } from '../models/profile.js';
import { audit } from './auditService.js';

export async function getProfile(user) {
  let profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.profile.create({
      data: { userId: user.id, ...profileDefaults() }
    });
  }
  return publicProfile({ ...user, profile });
}

export async function saveProfile(user, body) {
  const existing = await prisma.profile.findUnique({ where: { userId: user.id } });
  const current = existing || profileDefaults();

  const skills = Array.isArray(body.skills)
    ? body.skills
    : String(body.skills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  const profileData = {
    headline: body.headline ?? current.headline,
    about: body.about ?? current.about,
    skills,
    experience: body.experience ?? current.experience,
    portfolio: body.portfolio ?? current.portfolio,
    hourlyRate: body.hourlyRate ?? current.hourlyRate,
    availability: body.availability ?? current.availability,
    preferredContractType: body.preferredContractType ?? current.preferredContractType,
    preferredMilestoneStructure: body.preferredMilestoneStructure ?? current.preferredMilestoneStructure,
    settlementAsset: body.settlementAsset ?? current.settlementAsset,
    settlementNetwork: body.settlementNetwork ?? current.settlementNetwork,
    preferredFiat: body.preferredFiat ?? current.preferredFiat,
    preferredPayoutMethod: body.preferredPayoutMethod ?? current.preferredPayoutMethod,
    profileComplete: Boolean(body.headline || body.about || skills.length)
  };

  const userPatch = {};
  if (body.fullName) userPatch.fullName = String(body.fullName).trim();
  if (body.country) userPatch.country = String(body.country).toUpperCase().slice(0, 2);

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: profileData,
    create: { userId: user.id, ...profileData }
  });

  let updatedUser = user;
  if (Object.keys(userPatch).length) {
    updatedUser = await prisma.user.update({ where: { id: user.id }, data: userPatch });
  }

  await audit(user.id, 'PROFILE_SAVED', { profileComplete: profileData.profileComplete });
  return publicProfile({ ...updatedUser, profile });
}
