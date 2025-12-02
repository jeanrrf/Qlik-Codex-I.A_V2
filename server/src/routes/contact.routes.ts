import { Router } from "express";

import type { ContactApiResponse } from "../types/contact";
import { asyncHandler } from "../middleware/asyncHandler";
import { contactSchema } from "../validators/requestSchemas";
import { contactService } from "../services/contactService";

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

