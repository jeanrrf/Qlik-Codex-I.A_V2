import { Router } from "express";

import { asyncHandler } from "../middleware/asyncHandler";
import { contactService } from "../services/contactService";
import type { ContactApiResponse } from "../types/contact";
import { contactSchema } from "../validators/requestSchemas";

export const contactRouter = Router();

contactRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = contactSchema.parse(req.body);
    const record = await contactService.createContact(payload);

    const response: ContactApiResponse = {
      status: "received",
      ...record
    };

    res.status(201).json(response);
  })
);

